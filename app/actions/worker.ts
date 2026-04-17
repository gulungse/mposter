'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import OpenAI from 'openai'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import * as cheerio from 'cheerio'
import {
    processAutomationJob,
    generateGeminiContent,
    generateClaudeContent,
    generateGPTContent,
    generateFluxImage,
    generateThumbnail,
    uploadToWordPress,
    refreshBloggerToken,
    getSafeThumbnailText,
    generateAdvancedThumbnail,
    generateAdvancedContentImage,
    downloadImage
} from '@/lib/automation'
import { MODEL_ID_MAP } from '@/lib/ai-models'
import { fetchRandomImage } from '@/lib/image_providers'
import { AIModel } from '@prisma/client'
import axios from 'axios'
import { scrapeNaverBlog } from '@/lib/scraper'



/**
 * 마크다운 문법을 HTML로 강제 변환 (Failsafe)
 */
function convertMarkdownToHtml(text: string): string {
    if (!text) return '';

    let html = text;
    // 1. 헤더 변환 (### -> <h3>)
    html = html.replace(/^###\s+(.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.*$)/gim, '<h1>$1</h1>');

    // 2. 볼드체 (**text** -> <strong>text</strong>)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__((?:(?!__).)+)__/g, '<strong>$1</strong>');

    // 3. 리스트 (- item -> <li>item</li>)
    html = html.replace(/^\-\s+(.*$)/gim, '<li>$1</li>');

    // 4. 문단(단락)을 <p> 태그 혹은 블록 태그로 래핑하여 Blogger 에디터(Compose) 버그 방지
    // 두 번 이상의 줄바꿈(\n\n)을 기준으로 문단을 나눔
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // Blogger 에디터는 최상단에 <p>, <div>, <h2> 등의 블록 태그가 명시되어 있지 않으면
        // '작성(Compose)' 모드에서 본문을 렌더링하지 못하는 버그가 있음 (빈 화면 노출)
        // 따라서 모든 조각을 검사하여 블록 태그로 시작하지 않으면 <p>로 감쌈
        const isBlockTag = /^<(p|div|h[1-6]|ul|ol|li|blockquote|table|pre|hr|center|section|article|img|iframe|aside|header|footer)\b/i.test(trimmed);

        if (isBlockTag) {
            // 이미 블록 태그인 경우, 내부 줄바꿈만 <br />로 처리 (단, 태그 사이 줄바꿈은 제외)
            return trimmed.replace(/\n/g, '<br />').replace(/<\/li>\s*<br \/>\s*<li>/gi, '</li>\n<li>');
        }

        // 일반 텍스트이거나 인라인 태그(<a>, <strong> 등)로 시작하는 경우 전체를 <p>로 감쌈
        return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n\n');

    return html;
}

/**
 * 특정 데이터를 가지고 실제 사이트에 테스트 발행을 수행합니다.
 */
export async function testPublishAction(data: {
    siteId: string;
    keywordGroupId?: string;
    keywords?: string[];
    promptId?: string;
    customPrompt?: string;
    transcript?: string;
    aiModel: AIModel;
    imageSource: 'SCRAP' | 'DALLE' | 'FLUX' | 'NONE';
    imageCount?: number;
    wpCategoryId?: number;
    postStatus?: string;
    // 고급 권한 전용
    advThumbnailLines?: string[];
    advContentPhraseA?: string;
    advContentPhraseB?: string;
    advImageMode?: string;
    advCustomImages?: string[];
    useThumbnailTemplate?: boolean;
}) {
    let log: any = null;
    try {
        noStore();
        const user = await getOrCreateUser()

        // Raw SQL check for hasImageGenRights (Prisma Client might be stale)
        const rightsRes = await (prisma as any).$queryRawUnsafe(`SELECT "hasImageGenRights" FROM "users" WHERE id = '${user.id}'`)
        const hasRights = rightsRes?.[0]?.hasImageGenRights || false

        if (user.tokenBalance <= 0) {
            throw new Error('보유 토큰이 부족합니다. 테스트 발행을 위해서는 최소 1토큰이 필요합니다.')
        }

        const settings = (user as any).settings || {}

        const [site, keywordGroup, promptByDb] = await Promise.all([
            prisma.site.findUnique({ where: { id: data.siteId, userId: user.id } }),
            data.keywordGroupId ? prisma.keywordGroup.findUnique({ where: { id: data.keywordGroupId, userId: user.id } }) : Promise.resolve(null),
            data.promptId ? prisma.prompt.findFirst({
                where: {
                    id: data.promptId,
                    OR: [
                        { userId: user.id },
                        { type: 'SYSTEM' }
                    ]
                }
            }) : Promise.resolve(null)
        ])

        if (!site) throw new Error('대상 사이트를 찾을 수 없습니다.')
        if (!keywordGroup && !data.keywords?.length) throw new Error('키워드 데이터를 찾을 수 없습니다.')

        const finalPromptContent = data.customPrompt || promptByDb?.content
        if (!finalPromptContent) throw new Error('프롬프트 내용이 없습니다.')

        const keywords = (data.keywords && data.keywords.length > 0) ? data.keywords : (keywordGroup?.keywords as string[] || [])
        if (keywords.length === 0) throw new Error('사용 가능한 키워드가 없습니다.')

        const targetKeyword = keywords[Math.floor(Math.random() * keywords.length)]

        // 1. 로그 생성 (에러 추적 및 API 사용 통계용)
        try {
            log = await prisma.postLog.create({
                data: { 
                    userId: user.id, 
                    keyword: targetKeyword, 
                    status: 'PROCESSING'
                }
            })
        } catch (e) {
            console.error('Failed to create post log:', e);
        }

        let title = ''
        let content = ''
        let aiResult: any = {};
        const systemPrompt = finalPromptContent

        try {
            const modelId = MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o'
            
            if (data.aiModel.toString().includes('GPT')) {
                const apiKey = settings.openaiApiKey
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGPTContent(apiKey, systemPrompt, targetKeyword, modelId, data.transcript)
            } else if (data.aiModel.toString().includes('CLAUDE')) {
                const apiKey = settings.anthropicApiKey
                if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.')
                aiResult = await generateClaudeContent(apiKey, systemPrompt, targetKeyword, modelId, data.transcript)
            } else if (data.aiModel.toString().includes('GEMINI')) {
                const apiKey = settings.geminiApiKey
                if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
                // lib/automation.ts의 generateGeminiContent는 (apiKey, systemPrompt, targetKeyword, model, transcript) 순서임
                aiResult = await generateGeminiContent(apiKey, systemPrompt, targetKeyword, modelId, data.transcript)
            } else {
                throw new Error(`지원하지 않는 AI 모델입니다: ${data.aiModel}`);
            }
            title = aiResult.title || '테스트 제목'
            content = convertMarkdownToHtml(aiResult.content || '테스트 본문')
        } catch (err: any) {
            console.error('AI Generation Failed:', err)
            throw new Error(`[AI 생성 실패] ${err.response?.status === 401 ? 'API 키가 유효하지 않습니다.' : err.message}`)
        }

        // --- 이미지 생성 및 삽입 로직 ---
        const imageSource = data.imageSource || 'NONE'
        const imageCount = data.imageCount || 1
        let featuredMediaId = 0

        const $ = cheerio.load(content);
        const headings = $('h2, h3');

        if (headings.length > 0 && imageSource !== 'NONE') {

            const insertionRules = [
                { imgIdx: 1, headIdx: 0, pos: 'before' },
                { imgIdx: 2, headIdx: 2, pos: 'after' },
                { imgIdx: 3, headIdx: 3, pos: 'after' },
                { imgIdx: 4, headIdx: 4, pos: 'after' },
                { imgIdx: 5, headIdx: 5, pos: 'after' },
            ];

            for (let i = 1; i <= imageCount; i++) {
                const rule = insertionRules.find(r => r.imgIdx === i);
                if (!rule) continue;

                if (headings.length <= rule.headIdx) {
                    continue;
                }

                const targetHeading = $(headings[rule.headIdx]);
                let imageUrl = '';
                let success = false;
                const isPremium = data.advImageMode === 'PREMIUM';

                // 1. 첫 번째 이미지 (썸네일)
                if (i === 1 && site.type === 'WORDPRESS') {
                    const useTemplate = data.useThumbnailTemplate !== false;
                    
                    if (useTemplate) {
                        try {
                            if (hasRights && data.advThumbnailLines?.length === 4) {
                                // 고급 권한: 4줄 텍스트 + 배경 (커스텀 갤러리 또는 키워드 검색)
                                const searchKeyword = targetKeyword.split(' ')[0] || 'business';

                                // 프리미엄 모드이고 커스텀 이미지가 있으면 랜덤하게 선택 (테스트용)
                                let bgUrl = (isPremium && data.advCustomImages?.length)
                                    ? data.advCustomImages[Math.floor(Math.random() * data.advCustomImages.length)]
                                    : null;

                                if (!bgUrl) {
                                    const searchedBg = await fetchRandomImage(settings, searchKeyword, 1);
                                    bgUrl = searchedBg || `https://picsum.photos/600/600?random=${Date.now()}`;
                                }

                                // 1번 라인은 항상 현재 키워드로 고정
                                const finalLines = [...data.advThumbnailLines];
                                finalLines[0] = targetKeyword;

                                const thumbBuffer = await generateAdvancedThumbnail(bgUrl, finalLines);
                                const uploaded = await uploadToWordPress(site, thumbBuffer, `${targetKeyword}-adv-thumb-${Date.now()}`);
                                imageUrl = uploaded.url;
                                featuredMediaId = uploaded.id;
                            } else {
                                // 일반 권한: 기존 텍스트 썸네일
                                const safeThumbText = getSafeThumbnailText(aiResult.thumbnailText, title, targetKeyword);
                                const thumbBuffer = await generateThumbnail(safeThumbText);
                                const uploaded = await uploadToWordPress(site, thumbBuffer, `${targetKeyword}-thumb-${Date.now()}`);
                                imageUrl = uploaded.url;
                                featuredMediaId = uploaded.id;
                            }
                            success = true;
                        } catch (e) {
                            console.warn('WP/Thumbnail Template Error:', e);
                        }
                    }
                }

                // 2. 템플릿을 쓰지 않기로 했거나 (썸네일 포함), 2번째 이후의 이미지일 때
                if (!imageUrl && !isPremium) {
                    try {
                        if (imageSource === 'DALLE') {
                            const apiKey = settings.openaiApiKey
                            if (apiKey) {
                                const openai = new OpenAI({ apiKey })
                                const imgPrompt = i === 1 ? `${targetKeyword} minimal vector art` : `${targetKeyword} detailed photo ${i}`;
                                const image = await openai.images.generate({ model: "dall-e-3", prompt: imgPrompt, size: "1024x1024" })
                                imageUrl = image.data?.[0]?.url || ''
                                if (imageUrl) success = true;
                            }
                        } else if (imageSource === 'SCRAP') {
                            // AI가 생성한 영문 키워드 사용 (없으면 기본 키워드의 첫 단어 사용)
                            const searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                                ? aiResult.imageKeywords[i - 1]
                                : (targetKeyword.split(' ')[0] || 'korea');

                            // Multi-Source Image Fetch
                            imageUrl = await fetchRandomImage(settings, searchKeyword, i);

                            // Fallback
                            if (!imageUrl) {
                                const w = i === 1 ? 768 : 768;
                                const h = i === 1 ? 512 : 512;
                                imageUrl = `https://picsum.photos/${w}/${h}?random=${Math.floor(Math.random() * 10000) + i}`
                            }
                            success = true;
                        } else if (imageSource === 'FLUX') {
                            const apiKey = settings.piApiKey
                            if (apiKey) {
                                imageUrl = await generateFluxImage(apiKey, `${targetKeyword} blog image ${i}`)
                                if (imageUrl) success = true;
                            }
                        }
                    } catch (e) {
                        console.warn(`Image ${i} Generation/Scrape Failed`, e);
                    }
                }

                // 외부 이미지를 직접 본문에 넣지 않고 무조건 다운로드 & 업로드 처리
                if (imageUrl && site.type === 'WORDPRESS' && (!imageUrl.includes(site.url.replace(/^https?:\/\//, '')))) {
                    try {
                        const { buffer, contentType } = await downloadImage(imageUrl);
                        const uploaded = await uploadToWordPress(site, buffer, `${targetKeyword}-img-${i}-${Date.now()}`, contentType);
                        imageUrl = uploaded.url; // 사이트 내부 URL로 교체

                        // 썸네일로 지정되어야 하면 (위에서 템플릿으로 안 만들어진 1번 이미지)
                        if (i === 1) {
                            featuredMediaId = uploaded.id;
                        }
                    } catch (e) {
                         console.warn(`Failed to process WP upload for external image ${i}:`, e);
                         imageUrl = ''; // 업로드 실패 시 빈 문자열로 처리하여 태그가 본문에 삽입되지 않도록 함 (엑박 방지)
                         success = false;
                    }
                }

                // 고급 권한: 본문 이미지 특수 처리 (나머지 이미지들) (여기서도 실패시 imageUrl 초기화)
                if (hasRights && i > 1 && data.advContentPhraseA && data.advContentPhraseB) {
                    try {
                        let bgUrl = imageUrl;

                        // 프리미엄 모드이고 커스텀 이미지가 있으면 랜덤하게 이미지 사용 (테스트용)
                        if (data.advImageMode === 'PREMIUM' && data.advCustomImages?.length) {
                            bgUrl = data.advCustomImages[Math.floor(Math.random() * data.advCustomImages.length)];
                        }

                        if (bgUrl) {
                            const advancedImgBuffer = await generateAdvancedContentImage(bgUrl, targetKeyword, data.advContentPhraseA, data.advContentPhraseB);
                            if (site.type === 'WORDPRESS') {
                                const uploaded = await uploadToWordPress(site, advancedImgBuffer, `${targetKeyword}-adv-img-${i}-${Date.now()}`);
                                imageUrl = uploaded.url;
                            }
                            success = true;
                        }
                    } catch (e) {
                        console.warn(`Advanced Content Image ${i} generation failed:`, e);
                    }
                }

                if (imageUrl) {
                    const alt = `${targetKeyword} ${i > 1 ? i : ''}`;
                    const style = i === 1
                        ? "width:100%; max-width:500px; height:auto; aspect-ratio:1/1; object-fit:cover; display:block; margin: 20px auto; border-radius:8px;"
                        : "width:100%; max-width:700px; height:auto; aspect-ratio:700/350; object-fit:cover; display:block; margin: 20px auto; border-radius:8px;";
                    const imgTag = `<img src="${imageUrl}" alt="${alt}" style="${style}" />`;
                    if (rule.pos === 'before') targetHeading.before(imgTag);
                    else targetHeading.after(imgTag);
                }
            }
        }
        content = $.html();


        // 실제 사이트 발행
        try {
            if (site.type === 'WORDPRESS') {
                const targetStatus = data.postStatus || 'publish';
                const payload: any = {
                    title: `[테스트] ${title}`,
                    content: content,
                    status: 'draft', // 1단계: 일단 임시저장으로 생성 (안정성 확보)
                    categories: data.wpCategoryId ? [data.wpCategoryId] : []
                };
                if (featuredMediaId > 0) payload.featured_media = featuredMediaId;

                const wpRes = await axios.post(`${site.url}/wp-json/wp/v2/posts`, payload, {
                    auth: { username: site.username || '', password: site.apiToken || '' },
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                })

                // 2단계: 즉시 발행인 경우 상태 업데이트
                if (targetStatus === 'publish') {
                    await axios.post(`${site.url}/wp-json/wp/v2/posts/${wpRes.data.id}`, { status: 'publish' }, {
                        auth: { username: site.username || '', password: site.apiToken || '' },
                        timeout: 60000,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    })
                }
            } else if (site.type === 'BLOGSPOT') {
                const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
                const postToBlogger = async (token: string) => {
                    return axios.post(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
                        title: `[테스트] ${title}`,
                        content: content
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        timeout: 30000
                    });
                };

                try {
                    await postToBlogger(site.apiToken || '');
                } catch (err: any) {
                    if (err.response?.status === 401 && (site as any).refreshToken) {
                        const newToken = await refreshBloggerToken(site, settings.googleClientId, settings.googleClientSecret);
                        await postToBlogger(newToken);
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err: any) {
            console.error('Core Publishing Failed:', err)
            const status = err.response?.status
            if (status === 401) {
                if (site.type === 'WORDPRESS') {
                    throw new Error('[사이트 인증 실패] 워드프레스 사용자명 또는 애플리케이션 비밀번호가 틀렸습니다.')
                } else {
                    const hasRefreshToken = !!(site as any).refreshToken
                    const hasEnv = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

                    if (!hasRefreshToken) {
                        throw new Error('[사이트 인증 실패] 구글 토큰이 만료되었습니다. 사이트 관리에서 다시 연결하거나, 추가 시 Refresh Token을 입력해 주세요.')
                    } else if (!hasEnv) {
                        throw new Error('[서버 설정 미비] 토큰 갱신을 위한 GOOGLE_CLIENT_ID/SECRET이 .env에 없습니다. 관리자에게 문의하세요.')
                    } else {
                        throw new Error('[인증 실패] 구글 세션 갱신에 실패했습니다. 사이트를 다시 연결해 주세요.')
                    }
                }
            } else if (status === 403) {
                throw new Error('[사이트 권한 거부] API 접근 권한이 없거나 플러그인에 의해 차단되었습니다.')
            } else if (status === 404) {
                throw new Error('[사이트 주소 오류] REST API 경로를 찾을 수 없습니다. URL 주소를 확인해주세요.')
            }
            throw new Error(`[발행 실패] ${err.message} ${err.response?.status ? `(Status: ${err.response.status})` : ''} ${err.response?.data?.message ? `(${err.response.data.message})` : ''}`)
        }

        // 성공 시 로그 업데이트 (토큰 사용량 포함)
        await prisma.postLog.update({
            where: { id: log.id },
            data: {
                status: 'SUCCESS',
                title: title,
                inputTokens: aiResult.usage?.promptTokens || 0,
                outputTokens: aiResult.usage?.completionTokens || 0,
                aiModelUsed: aiResult.usage?.modelId || MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o',
                tokensUsed: 1 // 테스트 발행 고정 1토큰
            }
        })

        // 성공 시 토큰 차감 (-1)
        await (prisma as any).$executeRawUnsafe(
            'UPDATE "users" SET "tokenBalance" = "tokenBalance" - 1 WHERE "id" = $1',
            user.id
        )

        revalidatePath('/dashboard')
        return { success: true, message: '테스트 발행 성공! (1토큰 사용됨)' }
    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
        console.error('Final Catch in testPublishAction:', error)
        
        // 에러 발생 시 로그 실패 처리
        if (log?.id) {
            await prisma.postLog.update({
                where: { id: log.id },
                data: { status: 'FAILED', errorMessage: error.message }
            }).catch(() => {})
        }

        return { success: false, error: error.message }
    }
}

/**
 * 사용자가 입력한 제목/내용을 바탕으로 AI가 새 글을 생성합니다.
 */
export async function generateManualContentAction(data: {
    originalTitle: string;
    originalContent: string;
    promptId?: string;
    customPrompt?: string;
    aiModel: AIModel;
}) {
    try {
        noStore();
        const user = await getOrCreateUser()

        if (user.tokenBalance <= 0) {
            throw new Error('보유 토큰이 부족합니다.')
        }

        const settings = (user as any).settings || {}

        // 프롬프트 가져오기
        let promptContent = data.customPrompt
        if (data.promptId) {
            const p = await prisma.prompt.findFirst({
                where: {
                    id: data.promptId,
                    OR: [
                        { userId: user.id },
                        { type: 'SYSTEM' }
                    ]
                }
            })
            if (p) promptContent = p.content
        }

        if (!promptContent) throw new Error('사용할 프롬프트가 없습니다.')

        // AI 생성 요청에 원본 데이터 포함
        const targetKeyword = data.originalTitle || '제공된 제목'
        const inputContext = `[원본 제목]: ${data.originalTitle}\n\n[원본 내용]:\n${data.originalContent}`;

        let aiResult: any = {};

        const modelId = MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o'

        if (data.aiModel.toString().includes('GPT')) {
            const apiKey = settings.openaiApiKey
            if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGPTContent(apiKey, promptContent, targetKeyword, modelId, inputContext)
        } else if (data.aiModel.toString().includes('CLAUDE')) {
            const apiKey = settings.anthropicApiKey
            if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.')
            aiResult = await generateClaudeContent(apiKey, promptContent, targetKeyword, modelId, inputContext)
        } else if (data.aiModel.toString().includes('GEMINI')) {
            const apiKey = settings.geminiApiKey
            if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGeminiContent(apiKey, promptContent, targetKeyword, modelId, inputContext)
        } else {
            throw new Error(`지원하지 않는 모델입니다: ${data.aiModel}`)
        }

        // 토큰 차감 (-1)
        await (prisma as any).$executeRawUnsafe(
            'UPDATE "users" SET "tokenBalance" = "tokenBalance" - 1 WHERE "id" = $1',
            user.id
        )

        return {
            success: true,
            data: {
                title: aiResult.title,
                content: aiResult.content
            },
            message: '새 글 생성이 완료되었습니다. (1토큰 사용됨)'
        }

    } catch (error: any) {
        console.error('Manual Content Generation Failed:', error)
        return { success: false, error: error.message }
    }
}

/**
 * 자동화 작업 실행 (Server Action) - UI 호출용 (Auth 권한 체크)
 * 실제 실행 로직은 processAutomationJob(lib)으로 위임
 */
export async function runAutomationTask(jobId: string) {
    try {
        noStore();
        const user = await getOrCreateUser()

        // 권한 체크: 사용자가 작업의 소유자인지 확인
        const job = await prisma.automationJob.findUnique({
            where: { id: jobId, userId: user.id }
        })

        if (!job) return { success: false, error: '작업을 찾을 수 없거나 권한이 없습니다.' }

        // 실행 위임
        const result = await processAutomationJob(jobId)
        revalidatePath('/dashboard')
        return result

    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
        console.error('자동화 실행 요청 실패:', error)
        return { success: false, error: error.message }
    }
}


/**
 * 수동Generated 콘텐츠를 사이트에 발행합니다.
 */
export async function publishManualAction(data: {
    originalTitle: string;
    originalContent: string;
    promptId?: string;
    customPrompt?: string;
    aiModel: AIModel;
    siteId: string;
    wpCategoryId?: number;
    postStatus: 'publish' | 'draft';
    imageSource: 'ORIGINAL' | 'AI' | 'SCRAP' | 'NONE' | 'DALLE' | 'FLUX'; // mapping user input to internal keys
    imageCount: number;
}) {
    try {
        noStore();
        const user = await getOrCreateUser()

        // 토큰 체크 (2개 소모: 생성 + 발행) or (1개 소모)
        // 사용자가 "토큰 소모하게 해줘"라고 했으므로 1개 이상 필수.
        // 여기서는 자동화와 동일하게 1개 소모하는 것으로 구현 (또는 2개로 조정 가능)
        if (user.tokenBalance <= 0) {
            throw new Error('보유 토큰이 부족합니다.')
        }

        let settings = (user as any).settings || {}

        if (typeof settings === 'string') {
            try {
                settings = JSON.parse(settings);
            } catch (e) {
                console.error('[Manual Publish] settings is a string but not valid JSON');
            }
        }

        // 1. 사이트 및 프롬프트 로드
        const [site, promptByDb] = await Promise.all([
            prisma.site.findUnique({ where: { id: data.siteId, userId: user.id } }),
            data.promptId ? prisma.prompt.findFirst({
                where: {
                    id: data.promptId,
                    OR: [{ userId: user.id }, { type: 'SYSTEM' }]
                }
            }) : Promise.resolve(null)
        ])

        if (!site) throw new Error('대상 사이트를 찾을 수 없습니다.')

        const finalPromptContent = data.customPrompt || promptByDb?.content
        if (!finalPromptContent) throw new Error('사용할 프롬프트가 없습니다.')

        // 2. AI 텍스트 생성 (원본 내용을 기반으로)
        const targetKeyword = data.originalTitle || '제공된 제목'
        const inputContext = `[원본 제목]: ${data.originalTitle}\n\n[원본 내용]:\n${data.originalContent}`;

        let title = ''
        let content = ''
        let aiResult: any = {};

        const modelId = MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o'

        try {
            if (data.aiModel.toString().includes('GPT')) {
                const apiKey = settings.openaiApiKey
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGPTContent(apiKey, finalPromptContent, targetKeyword, modelId, inputContext)
            } else if (data.aiModel.toString().includes('CLAUDE')) {
                const apiKey = settings.anthropicApiKey
                if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.')
                aiResult = await generateClaudeContent(apiKey, finalPromptContent, targetKeyword, modelId, inputContext)
            } else if (data.aiModel.toString().includes('GEMINI')) {
                const apiKey = settings.geminiApiKey
                if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGeminiContent(apiKey, finalPromptContent, targetKeyword, modelId, inputContext)
            }
            // Ensure title/content are using the parsed results even if parsing was partial
            title = aiResult.title || targetKeyword;
            content = convertMarkdownToHtml(aiResult.content || '');
        } catch (err: any) {
            console.error('AI Generation/Parsing failed:', err);
            // Fallback to minimal if everything fails
            title = targetKeyword;
            content = convertMarkdownToHtml(data.originalContent);
        }

        // 3. 이미지 처리
        const imageSource = data.imageSource
        const imageCount = data.imageCount || 0
        let featuredMediaId = 0

        const $ = cheerio.load(content);
        const headings = $('h2, h3');

        // 원본 이미지 추출 (ORIGINAL 선택 시)
        let originalImages: string[] = []
        if (imageSource === 'ORIGINAL') {
            const $orig = cheerio.load(data.originalContent)
            $orig('img').each((_, img) => {
                const src = $orig(img).attr('src')
                if (src) originalImages.push(src)
            })
        }

        if (imageSource !== 'NONE' && (headings.length > 0 || imageSource === 'ORIGINAL')) {
            const insertionRules = [
                { imgIdx: 1, headIdx: 0, pos: 'before' },
                { imgIdx: 2, headIdx: 2, pos: 'after' },
                { imgIdx: 3, headIdx: 3, pos: 'after' },
                { imgIdx: 4, headIdx: 4, pos: 'after' },
                { imgIdx: 5, headIdx: 5, pos: 'after' },
            ];

            const effectiveCount = imageSource === 'ORIGINAL' ? originalImages.length : imageCount

            for (let i = 1; i <= Math.min(effectiveCount, 5); i++) {
                const rule = insertionRules.find(r => r.imgIdx === i);
                if (!rule) continue;

                let imageUrl = '';
                if (imageSource === 'ORIGINAL') {
                    const rawUrl = originalImages[i - 1];
                    const isNaverImage = rawUrl && (rawUrl.includes('naver') || rawUrl.includes('pstatic.net'));
                    if (isNaverImage) {
                        try {
                            // 네이버 이미지는 직접 다운로드 후 업로드 필수
                            const { buffer, contentType } = await downloadImage(rawUrl, {
                                'Referer': 'https://blog.naver.com/',
                                'Origin': 'https://naver.com'
                            });
                            if (site.type === 'WORDPRESS') {
                                const uploaded = await uploadToWordPress(site, buffer, `naver-orig-${Date.now()}-${i}`, contentType);
                                imageUrl = uploaded.url;
                                if (i === 1) featuredMediaId = uploaded.id;
                            } else {
                                // Blogger 등은 일단 원본 주소 유지 (또는 프록시 필요)
                                imageUrl = rawUrl;
                            }
                        } catch (e) {
                            console.warn(`Naver image download/upload failed for idx ${i}:`, e);
                            imageUrl = ''; // 이미지 업로드 실패 시 빈 값으로 두어 태그 삽입 방지 (엑박 방지)
                        }
                    } else {
                        imageUrl = rawUrl;
                    }
                } else {
                    // AI 또는 SCRAP 로직
                    try {
                        let searchKeyword = '';
                        if (aiResult.imageKeywords && aiResult.imageKeywords[i - 1]) {
                            searchKeyword = aiResult.imageKeywords[i - 1];
                        } else {
                            // [고도화] 폴백 키워드 추출: 제목에서 핵심 단어 추출 및 정리
                            const cleanTitle = targetKeyword
                                .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318Fa-zA-Z0-9\s]/g, '') // 특수문자 제거
                                .split(/\s+/)
                                .filter(word => word.length > 1); // 1글자 제외

                            // 최대 2-3단어 조합하여 검색어 생성
                            searchKeyword = cleanTitle.slice(0, 3).join(' ') || 'korea culture';
                            console.log(`[Manual Publish] No AI keyword for image ${i}, extracted fallback: "${searchKeyword}"`);
                        }

                        if (imageSource === 'DALLE') {
                            const apiKey = settings.openaiApiKey
                            if (apiKey) {
                                const openai = new OpenAI({ apiKey })
                                const imgPrompt = i === 1 ? `${targetKeyword} minimal vector art` : `${targetKeyword} detailed photo ${i}`;
                                const image = await openai.images.generate({ model: "dall-e-3", prompt: imgPrompt, size: "1024x1024" })
                                imageUrl = image.data?.[0]?.url || ''
                            }
                        } else if (imageSource === 'FLUX') {
                            const apiKey = settings.piApiKey
                            if (apiKey) {
                                imageUrl = await generateFluxImage(apiKey, `${targetKeyword} blog image ${i}`)
                            }
                        } else if (imageSource === 'SCRAP') {
                            imageUrl = await fetchRandomImage(settings, searchKeyword, i);
                            if (!imageUrl) {
                                // [수정] pollinations.ai에 캐시 버스터 추가 및 530 에러 대비
                                console.log(`[Manual Publish] Scrap failed for "${searchKeyword}", using AI fallback...`);
                                const seed = Math.floor(Math.random() * 1000000);
                                imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(searchKeyword + ' high quality professional photography')}?width=800&height=500&seed=${seed}&nologo=true&t=${Date.now()}`;
                            }
                        }
                    } catch (e) {
                        console.warn(`Manual image gen failed for idx ${i}:`, e)
                    }
                }

                if (imageUrl) {
                    // [수정] 모든 외부 이미지(AI/SCRAP)를 워드프레스로 업로드하여 엑박 방지
                    if (site.type === 'WORDPRESS' && imageSource !== 'ORIGINAL') {
                        try {
                            const { buffer, contentType } = await downloadImage(imageUrl);
                            const uploaded = await uploadToWordPress(site, buffer, `${targetKeyword}-${i}-${Date.now()}`, contentType);
                            imageUrl = uploaded.url;

                            // 첫 번째 이미지는 썸네일(featured_media)로 설정
                            if (i === 1) {
                                featuredMediaId = uploaded.id;
                            }
                        } catch (e) {
                            console.warn(`WP Media Upload Failed for image ${i}:`, e)
                        }
                    }

                    const alt = `${targetKeyword} ${i > 1 ? i : ''}`;
                    const imgTag = `<img src="${imageUrl}" alt="${alt}" style="width:100%; max-width:700px; height:auto; display:block; margin: 20px auto; border-radius:8px;" />`;

                    const targetHeadingIdx = Math.min(rule.headIdx, headings.length - 1)

                    if (targetHeadingIdx >= 0) {
                        const targetHeading = $(headings[targetHeadingIdx]);
                        if (rule.pos === 'before') targetHeading.before(imgTag);
                        else targetHeading.after(imgTag);
                    } else if (i === 1) {
                        $.root().prepend(imgTag)
                    } else {
                        $.root().append(imgTag)
                    }
                }
            }
        }

        // [수정] 모든 외부 이미지를 해당 사이트로 마이그레이션하여 엑박 원천 차단
        const allImages = $('img');
        for (let i = 0; i < allImages.length; i++) {
            const $img = $(allImages[i]);
            let src = $img.attr('src') || '';

            // 이미 사이트 도메인이거나 데이터 URI, 또는 비어있으면 스탠바이
            if (!src || src.startsWith('data:') || (site.url && src.includes(site.url.replace(/^https?:\/\//, '')))) continue;

            try {
                // 네이버 이미지용 특수 처리
                const isNaver = src.includes('pstatic.net') || src.includes('naver.com');
                let downloadUrl = src;
                let downloadHeaders: any = {};

                if (isNaver) {
                    downloadUrl = src.split('?')[0];
                    const domainsToReplace = [
                        'postfiles.pstatic.net',
                        'mblogthumb-phinf.pstatic.net',
                        'phinf.pstatic.net'
                    ];
                    for (const domain of domainsToReplace) {
                        if (downloadUrl.includes(domain)) {
                            downloadUrl = downloadUrl.replace(domain, 'blogfiles.pstatic.net');
                            break;
                        }
                    }
                    downloadHeaders = { 'Referer': 'https://blog.naver.com/' };
                }

                const { buffer, contentType } = await downloadImage(downloadUrl, downloadHeaders);

                if (site.type === 'WORDPRESS') {
                    const uploaded = await uploadToWordPress(site, buffer, `migrated-${Date.now()}-${i}`, contentType);
                    $img.attr('src', uploaded.url);
                    // 레이지 로딩 속성 제거 및 정리
                    $img.removeAttr('data-lazy-src');
                    $img.removeAttr('data-src');
                    $img.attr('loading', 'lazy');

                    // 썸네일이 아직 지정되지 않았다면 첫 번째 성공 이미지로 지정
                    if (featuredMediaId === 0) {
                        featuredMediaId = uploaded.id;
                    }

                    // 연속 업로드 시 과부하 방지 (0.3초 대기)
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (e) {
                console.warn(`Global image migration failed for ${src}:`, e);
                // 마이그레이션에 실패한 외부 이미지는 엑박이 나올 확률이 높으므로 본문에서 제거
                $img.remove();
            }
        }

        content = $.html();

        // 4. 사이트 발행
        try {
            if (site.type === 'WORDPRESS') {
                const payload: any = {
                    title: title,
                    content: content,
                    status: 'draft',
                    categories: data.wpCategoryId ? [data.wpCategoryId] : []
                };
                if (featuredMediaId > 0) payload.featured_media = featuredMediaId;

                const wpRes = await axios.post(`${site.url}/wp-json/wp/v2/posts`, payload, {
                    auth: { username: site.username || '', password: site.apiToken || '' },
                    timeout: 60000
                })

                if (data.postStatus === 'publish') {
                    await axios.post(`${site.url}/wp-json/wp/v2/posts/${wpRes.data.id}`, { status: 'publish' }, {
                        auth: { username: site.username || '', password: site.apiToken || '' },
                        timeout: 60000
                    })
                }
            } else if (site.type === 'BLOGSPOT') {
                const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
                const postToBlogger = async (token: string) => {
                    return axios.post(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
                        title: title,
                        content: content,
                        status: data.postStatus === 'publish' ? 'LIVE' : 'DRAFT'
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        timeout: 30000
                    });
                };

                try {
                    await postToBlogger(site.apiToken || '');
                } catch (err: any) {
                    if (err.response?.status === 401 && (site as any).refreshToken) {
                        const newToken = await refreshBloggerToken(site, settings.googleClientId, settings.googleClientSecret);
                        await postToBlogger(newToken);
                    } else throw err;
                }
            }
        } catch (err: any) {
            throw new Error(`[발행 실패] ${err.message}`)
        }

        // 5. 토큰 차감 (-1)
        await (prisma as any).$executeRawUnsafe(
            'UPDATE "users" SET "tokenBalance" = "tokenBalance" - 1 WHERE "id" = $1',
            user.id
        )

        revalidatePath('/dashboard')
        return { success: true, message: '글 생성 및 사이트 발행이 완료되었습니다! (1토큰 사용됨)' }

    } catch (error: any) {
        console.error('publishManualAction Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * 네이버 블로그 URL로부터 내용을 추출합니다.
 */
export async function scrapeNaverBlogAction(url: string) {
    try {
        noStore();
        await getOrCreateUser();
        const result = await scrapeNaverBlog(url);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('scrapeNaverBlogAction error:', error);
        return { success: false, error: error.message };
    }
}
