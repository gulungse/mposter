'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import OpenAI from 'openai'
import { revalidatePath } from 'next/cache'
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
    generateAdvancedContentImage
} from '@/lib/automation'
import { fetchRandomImage } from '@/lib/image_providers'
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
    aiModel: 'GPT4O' | 'GEMINI' | 'CLAUDE' | 'GPT5';
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
}) {
    try {
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

        let title = ''
        let content = ''
        let aiResult: any = {};
        const systemPrompt = finalPromptContent

        try {
            if (data.aiModel === 'GPT4O') {
                const apiKey = settings.openaiApiKey
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o', data.transcript)
                title = aiResult.title || '테스트 제목'
                content = convertMarkdownToHtml(aiResult.content || '테스트 본문')
            } else if (data.aiModel === 'CLAUDE') { // Added CLAUDE case
                const apiKey = settings.anthropicApiKey
                if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.')
                aiResult = await generateClaudeContent(apiKey, systemPrompt, targetKeyword, data.transcript)
                title = aiResult.title || '테스트 제목'
                content = convertMarkdownToHtml(aiResult.content || '테스트 본문')
            } else if (data.aiModel === 'GEMINI') { // Explicitly handle GEMINI
                const apiKey = settings.geminiApiKey
                if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGeminiContent(apiKey, systemPrompt, targetKeyword, data.transcript)
                title = aiResult.title || '테스트 제목'
                content = convertMarkdownToHtml(aiResult.content || '테스트 본문')
            } else if (data.aiModel === 'GPT5') { // Added GPT5 case
                const apiKey = settings.openaiApiKey
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
                aiResult = await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-5-mini', data.transcript)
                title = aiResult.title || '테스트 제목'
                content = convertMarkdownToHtml(aiResult.content || '테스트 본문')
            } else {
                // Fallback or error for unsupported AI models if needed
                throw new Error(`지원하지 않는 AI 모델입니다: ${data.aiModel}`);
            }
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

                if (i === 1 && site.type === 'WORDPRESS') {
                    try {
                        if (hasRights && data.advThumbnailLines?.length === 4) {
                            // 고급 권한: 4줄 텍스트 + 배경 (커스텀 갤러리 또는 키워드 검색)
                            const searchKeyword = targetKeyword.split(' ')[0] || 'business';

                            // 프리미엄 모드이고 커스텀 이미지가 있으면 랜덤하게 선택 (테스트용)
                            let bgUrl = (data.advImageMode === 'PREMIUM' && data.advCustomImages?.length)
                                ? data.advCustomImages[Math.floor(Math.random() * data.advCustomImages.length)]
                                : null;

                            if (!bgUrl) {
                                const searchedBg = await fetchRandomImage(settings, searchKeyword, 1);
                                bgUrl = searchedBg || `https://loremflickr.com/600/600/${encodeURIComponent(searchKeyword)}`;
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
                        console.warn('WP/Thumbnail Error:', e);
                    }
                }

                const isPremium = data.advImageMode === 'PREMIUM';
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

                            // Fallback to LoremFlickr
                            if (!imageUrl) {
                                const w = i === 1 ? 768 : 768;
                                const h = i === 1 ? 512 : 512;
                                imageUrl = `https://loremflickr.com/${w}/${h}/${encodeURIComponent(searchKeyword)}?lock=${Math.floor(Math.random() * 100000) + i}&random=${Date.now()}${i}`
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
                        console.warn(`Image ${i} Generation Failed`, e);
                    }
                }

                // 고급 권한: 본문 이미지 특수 처리 (나머지 이미지들)
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
    aiModel: 'GPT4O' | 'GEMINI' | 'CLAUDE' | 'GPT5';
}) {
    try {
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

        if (data.aiModel === 'GPT4O') {
            const apiKey = settings.openaiApiKey
            if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGPTContent(apiKey, promptContent, targetKeyword, 'gpt-4o', inputContext)
        } else if (data.aiModel === 'CLAUDE') {
            const apiKey = settings.anthropicApiKey
            if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.')
            aiResult = await generateClaudeContent(apiKey, promptContent, targetKeyword, inputContext)
        } else if (data.aiModel === 'GEMINI') {
            const apiKey = settings.geminiApiKey
            if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGeminiContent(apiKey, promptContent, targetKeyword, inputContext)
        } else if (data.aiModel === 'GPT5') {
            const apiKey = settings.openaiApiKey
            if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGPTContent(apiKey, promptContent, targetKeyword, 'gpt-5-mini', inputContext)
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
        const user = await getOrCreateUser()

        // 권한 체크: 사용자가 작업의 소유자인지 확인
        const job = await prisma.automationJob.findUnique({
            where: { id: jobId, userId: user.id }
        })

        if (!job) return { success: false, error: '작업을 찾을 수 없거나 권한이 없습니다.' }

        // 실행 위임
        return await processAutomationJob(jobId)

    } catch (error: any) {
        if (error.digest?.startsWith('NEXT_REDIRECT')) throw error
        console.error('자동화 실행 요청 실패:', error)
        return { success: false, error: error.message }
    }
}

/**
 * 네이버 블로그 URL로부터 내용을 추출합니다.
 */
export async function scrapeNaverBlogAction(url: string) {
    try {
        await getOrCreateUser();
        const result = await scrapeNaverBlog(url);
        return { success: true, data: result };
    } catch (error: any) {
        console.error('scrapeNaverBlogAction error:', error);
        return { success: false, error: error.message };
    }
}
