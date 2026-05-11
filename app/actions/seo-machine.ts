'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import {
    generateGeminiContent,
    generateClaudeContent,
    generateGPTContent,
    uploadToWordPress,
    refreshBloggerToken,
    downloadImage,
    generateThumbnail,
    getSafeThumbnailText,
    generateFluxImage
} from '@/lib/automation'
import { fetchRandomImage } from '@/lib/image_providers'
import { MODEL_ID_MAP } from '@/lib/ai-models'
import { AIModel } from '@prisma/client'
import OpenAI from 'openai'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'

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

    // 4. 문단(단락)을 <p> 태그 혹은 블록 태그로 래핑하여 Blogger 에디터 버그 방지
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        const isBlockTag = /^<(p|div|h[1-6]|ul|ol|li|blockquote|table|pre|hr|center|section|article|img|iframe|aside|header|footer)\b/i.test(trimmed);

        if (isBlockTag) {
            return trimmed.replace(/\n/g, '<br />').replace(/<\/li>\s*<br \/>\s*<li>/gi, '</li>\n<li>');
        }

        return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n\n');

    return html;
}

export async function publishSeoMachineAction(data: {
    keyword: string;
    brandVoice: string;
    toneAndManner: string;
    aiModel: AIModel;
    siteId: string;
    wpCategoryId?: number;
    postStatus: 'publish' | 'draft';
    imageCount: number;
    imageSource: 'AI' | 'SCRAP' | 'NONE' | 'DALLE' | 'FLUX';
}) {
    let log: any = null;
    try {
        noStore();
        const user = await getOrCreateUser();

        if (user.tokenBalance <= 0) {
            throw new Error('보유 토큰이 부족합니다. (최소 1토큰 필요)');
        }

        const settings = (user as any).settings || {};
        const site = await prisma.site.findUnique({ where: { id: data.siteId, userId: user.id } });

        if (!site) throw new Error('대상 사이트를 찾을 수 없습니다.');
        if (!data.keyword || data.keyword.trim() === '') throw new Error('키워드를 입력해주세요.');

        // 로그 생성
        try {
            log = await prisma.postLog.create({
                data: {
                    userId: user.id,
                    keyword: data.keyword,
                    status: 'PROCESSING',
                    title: `[SEO Machine] ${data.keyword}`
                }
            });
        } catch (e) {
            console.error('Failed to create post log:', e);
        }

        // --- 1. SEO Machine 프롬프트 조립 ---
        const systemPrompt = `당신은 최고 수준의 SEO 전문가이자 숙련된 블로그 카피라이터입니다.
주어진 키워드에 대해 다음 가이드라인을 엄격하게 준수하여 전문적이고 가치 있는 블로그 포스팅을 작성하세요.

[브랜드 보이스 및 글쓰기 스타일]
- 브랜드 보이스/스타일: ${data.brandVoice}
- 톤앤매너: ${data.toneAndManner}
위 스타일과 톤을 철저하게 유지하면서 독자에게 신뢰감을 주고 자연스럽게 읽히도록 작성하세요.

[콘텐츠 및 구조 요구사항]
1. 분량: 2000단어 이상으로 매우 상세하고 깊이 있게 작성하세요.
2. 구조: 서론(흥미 유발, 문제 제기, 해결책 제시) - 본론(H2와 H3를 활용한 논리적 전개) - 결론(요약 및 행동 촉구/Call to Action)으로 구성하세요.
3. 가독성: 한 문단은 2~4문장으로 짧게 유지하고, 중요한 내용은 리스트(글머리 기호)를 적극 활용하세요.

[SEO 최적화 가이드]
1. 키워드 최적화: '${data.keyword}' 키워드를 제목(title), 서론의 첫 100단어 이내, 그리고 2~3개의 H2에 자연스럽게 포함하세요.
2. LSI 키워드: 주제와 관련된 다양한 연관 검색어(LSI 키워드)를 문맥에 맞게 섞어 쓰세요. 키워드 패딩(억지로 끼워넣기)은 절대 금지합니다.
3. 독창성: AI가 작성한 티가 나지 않도록 로봇 같은 표현, 뻔한 전개를 피하고 인간적이고 독창적인 관점을 제시하세요.

[기술적 필수 제약사항] - **시스템 연동을 위해 무조건 지키세요**
1. 형식: 반드시 순수한 JSON 형식으로만 응답해야 합니다. (마크다운 코드블록(\`\`\`) 금지)
2. 태그 제한: <h1>, <html>, <head>, <body>, <style>, <script> 태그 및 인라인 스타일(style="...")은 절대 사용하지 마세요. 오직 본문 태그(<h2>, <h3>, <p>, <ul>, <li>, <strong>)만 허용됩니다. 제목은 'title' 필드에 넣고 본문에 적지 마세요.
3. 반환할 JSON 구조:
{
  "title": "[검색 결과에서 클릭을 유도하는 50~60자 이내의 매력적인 제목]",
  "content": "[상기 가이드라인을 모두 충족하는 풍부한 HTML 본문]",
  "imageKeywords": ["[각 본문 섹션의 내용을 구체적으로 묘사하는 고품질 영문 이미지 검색 키워드 5개 (예: 'professional business team working in modern office')]"],
  "thumbnailText": "[썸네일에 들어갈 10자 이내의 짧고 강렬한 문구. 제목과 다른 내용일 것]"
}`;

        // --- 2. AI 콘텐츠 생성 ---
        let aiResult: any = {};
        const modelId = MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o';
        
        try {
            if (data.aiModel.toString().includes('GPT')) {
                const apiKey = settings.openaiApiKey;
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.');
                aiResult = await generateGPTContent(apiKey, systemPrompt, data.keyword, modelId);
            } else if (data.aiModel.toString().includes('CLAUDE')) {
                const apiKey = settings.anthropicApiKey;
                if (!apiKey) throw new Error('Claude API 키가 설정되어 있지 않습니다.');
                aiResult = await generateClaudeContent(apiKey, systemPrompt, data.keyword, modelId);
            } else if (data.aiModel.toString().includes('GEMINI')) {
                const apiKey = settings.geminiApiKey;
                if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.');
                aiResult = await generateGeminiContent(apiKey, systemPrompt, data.keyword, modelId);
            } else {
                throw new Error(`지원하지 않는 모델입니다: ${data.aiModel}`);
            }
        } catch (err: any) {
            console.error('AI Generation Failed:', err);
            throw new Error(`[AI 생성 실패] ${err.message}`);
        }

        const title = aiResult.title || `${data.keyword}에 대한 완벽 가이드`;
        let content = convertMarkdownToHtml(aiResult.content || '');

        // --- 3. 이미지 처리 ---
        const imageSource = data.imageSource;
        const imageCount = data.imageCount || 0;
        let featuredMediaId = 0;

        const $ = cheerio.load(content);
        const headings = $('h2, h3');

        if (imageSource !== 'NONE' && headings.length > 0) {
            const insertionRules = [
                { imgIdx: 1, headIdx: 0, pos: 'before' },
                { imgIdx: 2, headIdx: 2, pos: 'after' },
                { imgIdx: 3, headIdx: 3, pos: 'after' },
                { imgIdx: 4, headIdx: 4, pos: 'after' },
                { imgIdx: 5, headIdx: 5, pos: 'after' },
            ];

            for (let i = 1; i <= Math.min(imageCount, 5); i++) {
                const rule = insertionRules.find(r => r.imgIdx === i);
                if (!rule || headings.length <= rule.headIdx) continue;

                let imageUrl = '';
                const targetHeading = $(headings[rule.headIdx]);

                // 1번 이미지는 텍스트 썸네일 (템플릿) 생성 시도
                if (i === 1 && site.type === 'WORDPRESS') {
                    try {
                        const safeThumbText = getSafeThumbnailText(aiResult.thumbnailText, title, data.keyword);
                        const thumbBuffer = await generateThumbnail(safeThumbText);
                        const uploaded = await uploadToWordPress(site, thumbBuffer, `${data.keyword}-thumb-${Date.now()}`);
                        imageUrl = uploaded.url;
                        featuredMediaId = uploaded.id;
                    } catch (e) {
                        console.warn('WP/Thumbnail Template Error:', e);
                    }
                }

                // 썸네일 생성을 안했거나, 2번 이상 이미지인 경우
                if (!imageUrl) {
                    try {
                        let searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                            ? aiResult.imageKeywords[i - 1]
                            : `${data.keyword} related`;

                        if (imageSource === 'DALLE') {
                            const apiKey = settings.openaiApiKey;
                            if (apiKey) {
                                const openai = new OpenAI({ apiKey });
                                const image = await openai.images.generate({ model: "dall-e-3", prompt: searchKeyword, size: "1024x1024" });
                                imageUrl = image.data?.[0]?.url || '';
                            }
                        } else if (imageSource === 'FLUX') {
                            const apiKey = settings.piApiKey;
                            if (apiKey) {
                                imageUrl = await generateFluxImage(apiKey, searchKeyword);
                            }
                        } else if (imageSource === 'SCRAP' || imageSource === 'AI') {
                            imageUrl = await fetchRandomImage(settings, searchKeyword, i);
                            if (!imageUrl) {
                                const seed = Math.floor(Math.random() * 1000000);
                                imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(searchKeyword + ' high quality professional photography')}?width=800&height=500&seed=${seed}&nologo=true&t=${Date.now()}`;
                            }
                        }
                    } catch (e) {
                        console.warn(`Image ${i} Generation/Scrape Failed:`, e);
                    }
                }

                if (imageUrl) {
                    // 외부 이미지 워드프레스 업로드
                    if (site.type === 'WORDPRESS' && (!imageUrl.includes(site.url.replace(/^https?:\/\//, '')))) {
                        try {
                            const { buffer, contentType } = await downloadImage(imageUrl);
                            const uploaded = await uploadToWordPress(site, buffer, `${data.keyword}-img-${i}-${Date.now()}`, contentType);
                            imageUrl = uploaded.url;
                            if (i === 1) featuredMediaId = uploaded.id;
                        } catch (e) {
                            console.warn(`Failed to process WP upload for external image ${i}:`, e);
                            imageUrl = '';
                        }
                    }

                    if (imageUrl) {
                        const alt = `${data.keyword} ${i > 1 ? i : ''}`;
                        const style = i === 1
                            ? "width:100%; max-width:500px; height:auto; aspect-ratio:1/1; object-fit:cover; display:block; margin: 20px auto; border-radius:8px;"
                            : "width:100%; max-width:700px; height:auto; aspect-ratio:700/350; object-fit:cover; display:block; margin: 20px auto; border-radius:8px;";
                        const imgTag = `<img src="${imageUrl}" alt="${alt}" style="${style}" />`;
                        if (rule.pos === 'before') targetHeading.before(imgTag);
                        else targetHeading.after(imgTag);
                    }
                }
            }
        }

        if (site.type === 'BLOGSPOT') {
            const bodyHtml = $('body').html();
            content = (bodyHtml || $.html()).trim();
            content = `<div class="blogger-post-wrapper">\n${content}\n</div>`;
        } else {
            content = $.html();
        }

        // --- 4. 사이트 발행 ---
        try {
            if (site.type === 'WORDPRESS') {
                const payload: any = {
                    title: title,
                    content: content,
                    status: data.postStatus,
                    categories: data.wpCategoryId ? [data.wpCategoryId] : []
                };
                if (featuredMediaId > 0) payload.featured_media = featuredMediaId;

                await axios.post(`${site.url}/wp-json/wp/v2/posts`, payload, {
                    auth: { username: site.username || '', password: site.apiToken || '' },
                    timeout: 60000,
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
            } else if (site.type === 'BLOGSPOT') {
                const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
                const requestUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`;
                
                const postToBlogger = async (token: string) => {
                    return axios.post(requestUrl, {
                        kind: 'blogger#post',
                        title: title,
                        content: content
                    }, {
                        headers: { 'Authorization': `Bearer ${token}` },
                        params: { isDraft: data.postStatus === 'draft' },
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
            console.error('Publishing Failed:', err);
            throw new Error(`[발행 실패] ${err.message}`);
        }

        // --- 5. 마무리 ---
        if (log?.id) {
            await prisma.postLog.update({
                where: { id: log.id },
                data: {
                    status: 'SUCCESS',
                    title: title,
                    inputTokens: aiResult.usage?.promptTokens || 0,
                    outputTokens: aiResult.usage?.completionTokens || 0,
                    aiModelUsed: aiResult.usage?.modelId || MODEL_ID_MAP[data.aiModel as AIModel] || 'gpt-4o',
                    tokensUsed: 1
                }
            });
        }

        await (prisma as any).$executeRawUnsafe(
            'UPDATE "users" SET "tokenBalance" = "tokenBalance" - 1 WHERE "id" = $1',
            user.id
        );

        revalidatePath('/dashboard');
        return { success: true, message: 'SEO 머신 발행이 성공적으로 완료되었습니다. (1토큰 사용)' };

    } catch (error: any) {
        console.error('publishSeoMachineAction Error:', error);
        if (log?.id) {
            await prisma.postLog.update({
                where: { id: log.id },
                data: { status: 'FAILED', errorMessage: error.message }
            }).catch(() => {});
        }
        return { success: false, error: error.message };
    }
}
