import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from 'openai'
import axios from 'axios'
import { revalidatePath } from 'next/cache'
import * as cheerio from 'cheerio'
import { fetchRandomImage } from '@/lib/image_providers'
import sharp from 'sharp'
import satori from 'satori'
import { createElement } from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 블로거(Blogger)의 만료된 Access Token을 Refresh Token으로 갱신합니다.
 */
export async function refreshBloggerToken(site: any, clientId?: string, clientSecret?: string) {
    const refreshToken = site.refreshToken || (site as any).refreshToken;
    if (!refreshToken) throw new Error('Refresh Token이 없어 토큰을 갱신할 수 없습니다. 사이트를 다시 연결해 주세요.');

    const finalClientId = clientId || process.env.GOOGLE_CLIENT_ID;
    const finalClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!finalClientId || !finalClientSecret) {
        throw new Error('토큰이 만료되었으나 자동 갱신을 위한 설정(Google Client ID/Secret)이 없습니다. API 관리 메뉴에서 설정을 확인하거나 사이트를 다시 연결해 주세요.');
    }

    try {
        const response = await axios.post('https://oauth2.googleapis.com/token', {
            client_id: finalClientId,
            client_secret: finalClientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        const newAccessToken = response.data.access_token;
        if (!newAccessToken) throw new Error('새로운 Access Token을 받지 못했습니다.');

        // DB 업데이트 (as any로 타입 오류 회피)
        await prisma.site.update({
            where: { id: site.id },
            data: { apiToken: newAccessToken } as any
        });

        return newAccessToken;
    } catch (err: any) {
        console.error('Blogger Token Refresh Failed:', err.response?.data || err.message);
        throw new Error('Google 로그인 세션이 만료되었습니다. 사이트 관리에서 다시 연결해 주세요.');
    }
}

/**
 * 사용 가능한 제미나이 모델을 지능적으로 타겟팅하여 콘텐츠를 생성합니다.
 */
export async function getAvailableGeminiModels(apiKey: string) {
    try {
        const refererUrl = process.env.NEXT_PUBLIC_SITE_URL
            ? (process.env.NEXT_PUBLIC_SITE_URL.endsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : `${process.env.NEXT_PUBLIC_SITE_URL}/`)
            : 'http://localhost:3000/';

        // v1beta 엔드포인트에서 모델 목록 조회
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            headers: { 'Referer': refererUrl },
            timeout: 30000
        });

        return response.data?.models || [];
    } catch (error: any) {
        console.warn('Gemini Model List Failed:', error.message);
        return [];
    }
}

/**
 * 텍스트에서 해시태그(#태그)를 추출합니다.
 */
export function extractHashtags(text: string): string[] {
    if (!text) return [];
    
    // 1. HTML 태그 제거 (태그 내부의 #색상코드 방지)
    // <span style="color:#ffffff">#태그</span> 형태에서 #ffffff를 무시하고 #태그만 가져오기 위함
    const plainText = text.replace(/<[^>]*>?/gm, ' ');
    
    // 2. 해시태그 추출
    const matches = plainText.match(/#([a-zA-Z0-9가-힣]+)/g);
    if (!matches) return [];

    return matches
        .map(m => m.slice(1))
        .filter(tag => {
            // 단순 숫자만 있는 경우 제외 (예: #123) - 여전히 유효함
            if (/^\d+$/.test(tag)) return false;

            // '연관검색어' 같은 플레이스홀더 패턴 제외
            if (tag.includes('연관검색어')) return false;

            // 최소 2자 이상인 경우만 태그로 인정
            return tag.length >= 2;
        });
}

/**
 * 워드프레스 사이트에서 랜덤한 태그 2개를 가져옵니다.
 */
async function fetchRandomWordPressTags(site: any): Promise<{id: number, name: string}[]> {
    try {
        const response = await axios.get(`${site.url}/wp-json/wp/v2/tags?per_page=50&orderby=count&order=desc`, {
            auth: { username: site.username, password: site.apiToken },
            timeout: 10000
        });
        const tags = response.data.map((t: any) => ({ id: t.id, name: t.name }));
        if (tags.length === 0) return [];
        return tags.sort(() => 0.5 - Math.random()).slice(0, 2);
    } catch (e) {
        console.warn('[WP Tag] Failed to fetch random tags:', e);
        return [];
    }
}

/**
 * 워드프레스에 태그를 동기화하고 ID 목록을 반환합니다.
 */
export async function syncWordPressTags(site: any, tags: string[]): Promise<number[]> {
    const tagIds: number[] = [];
    for (const tagName of tags) {
        try {
            // 1. 기존 태그 검색 (완전 일치 검색을 위해 slug 사용 시도)
            const searchRes = await axios.get(`${site.url}/wp-json/wp/v2/tags?search=${encodeURIComponent(tagName)}`, {
                auth: { username: site.username, password: site.apiToken },
                timeout: 10000
            });
            const existingTag = searchRes.data.find((t: any) => t.name.toLowerCase() === tagName.toLowerCase());
            
            if (existingTag) {
                tagIds.push(existingTag.id);
            } else {
                // 2. 없으면 생성
                const createRes = await axios.post(`${site.url}/wp-json/wp/v2/tags`, { name: tagName }, {
                    auth: { username: site.username, password: site.apiToken },
                    timeout: 10000
                });
                tagIds.push(createRes.data.id);
            }
        } catch (e) {
            console.warn(`[WP Tag Sync] Failed for ${tagName}:`, e);
        }
    }
    return tagIds;
}

/**
 * 특정 태그들을 포함하는 최근 글 목록을 가져옵니다. (워드프레스용)
 */
async function fetchPostsByTags(site: any, tagIds: number[]) {
    if (tagIds.length === 0) return [];
    try {
        // 태그 중 랜덤하게 2개 선택 (검색 결과 최적화)
        const shuffled = [...tagIds].sort(() => 0.5 - Math.random());
        const targetTagIds = shuffled.slice(0, 2).join(',');
        
        const url = `${site.url}/wp-json/wp/v2/posts?tags=${targetTagIds}&per_page=5`;
        const response = await axios.get(url, {
            auth: { username: site.username, password: site.apiToken },
            timeout: 10000
        });
        return response.data.map((p: any) => ({ title: p.title.rendered, url: p.link }));
    } catch (e) {
        console.warn('[Internal Link] Failed to fetch posts by tags:', e);
        return [];
    }
}

/**
 * 블로거 사이트에서 최근 사용된 라벨(태그)들을 가져옵니다.
 */
async function fetchRandomBloggerLabels(site: any): Promise<string[]> {
    try {
        const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=20&fields=items(labels)`;
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${site.apiToken}` },
            timeout: 10000
        });
        const allLabels = new Set<string>();
        (response.data.items || []).forEach((post: any) => {
            (post.labels || []).forEach((label: string) => allLabels.add(label));
        });
        const labelList = Array.from(allLabels);
        if (labelList.length === 0) return [];
        return labelList.sort(() => 0.5 - Math.random()).slice(0, 2);
    } catch (e) {
        console.warn('[Blogger Tag] Failed to fetch random labels:', e);
        return [];
    }
}

/**
 * 특정 라벨을 포함하는 최근 글 목록을 가져옵니다. (블로거용)
 */
async function fetchBloggerPostsByLabels(site: any, labels: string[]) {
    if (labels.length === 0) return [];
    try {
        const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
        // 블로거 API는 여러 라벨 검색 시 q 파라미터나 필터링이 복잡하므로 첫 번째 라벨로 검색
        const label = labels[0];
        const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?labels=${encodeURIComponent(label)}&maxResults=5`;
        const response = await axios.get(url, {
            headers: { 'Authorization': `Bearer ${site.apiToken}` },
            timeout: 10000
        });
        return (response.data.items || []).map((p: any) => ({ title: p.title, url: p.url }));
    } catch (e) {
        console.warn('[Internal Link] Failed to fetch Blogger posts by labels:', e);
        return [];
    }
}

/**
 * 해당 카테고리의 최근 글 목록을 가져옵니다. (내부 링크용 Fallback)
 */
async function fetchRecentCategoryPosts(site: any, categoryId?: string) {
    try {
        if (site.type === 'WORDPRESS') {
            const url = `${site.url}/wp-json/wp/v2/posts?per_page=5${categoryId ? `&categories=${categoryId}` : ''}`;
            const response = await axios.get(url, {
                auth: { username: site.username, password: site.apiToken },
                timeout: 10000
            });
            return response.data.map((p: any) => ({ title: p.title.rendered, url: p.link }));
        } else if (site.type === 'BLOGSPOT') {
            const blogId = site.username || site.url.split('blogId=')[1] || site.url.replace(/[^0-9]/g, '');
            const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts?maxResults=5`;
            const response = await axios.get(url, {
                headers: { 'Authorization': `Bearer ${site.apiToken}` },
                timeout: 10000
            });
            return (response.data.items || []).map((p: any) => ({ title: p.title, url: p.url }));
        }
    } catch (e) {
        console.warn('[Internal Link] Failed to fetch recent posts:', e);
    }
    return [];
}

export async function generateGeminiContent(apiKey: string, systemPrompt: string, targetKeyword: string, existingPosts: any[] = []) {
    const trimmedKey = apiKey.trim()

    // 1. 사용 가능한 모델 목록 조회 (스마트 감지)
    const availableModels = await getAvailableGeminiModels(trimmedKey);
    const availableNames = availableModels.map((m: any) => m.name); // 예: ['models/gemini-1.5-flash', ...]
    console.log('Available Gemini Models:', availableNames);

    // 2. 우선순위에 따라 최적의 모델 선택
    // 사용자 요청: 무조건 Gemini Flash 계열만 사용 (비용 절감)
    // 우선순위: 2.5 Flash > 2.0 Flash > 1.5 Flash > 기타 Flash
    let selectedModelName = availableNames.find((name: string) => name.includes('gemini-2.5-flash'))
        || availableNames.find((name: string) => name.includes('gemini-2.0-flash'))
        || availableNames.find((name: string) => name.includes('gemini-1.5-flash'))
        || availableNames.find((name: string) => name.includes('flash'));

    // 목록이 없거나 찾지 못해도 최신 Flash 모델로 안전장치
    let modelId = selectedModelName ? selectedModelName.replace('models/', '') : 'gemini-1.5-flash';

    // 1.5/2.0 등 최신 모델은 v1beta 지원
    const version = 'v1beta';

    console.log(`Selected Target Model: ${modelId} (${version})`);

    // 내부 링크 정보 구성
    let internalLinkContext = '';
    if (existingPosts.length > 0) {
        internalLinkContext = `\n\n[내부 링크 필수 지시사항]: 
당신은 현재 작성 중인 글과 관련성이 높은 기존 포스팅 목록을 가지고 있습니다. 
SEO 점수를 높이기 위해 본문 내용 중 가장 자연스러운 맥락에서 아래 링크들 중 최소 1~2개를 반드시 <a href="URL">제목</a> 형태의 HTML 태그로 포함시켜주세요. 
단순히 하단에 목록을 나열하지 말고, 본문의 문장 속에서 자연스럽게 언급해야 합니다:
${existingPosts.map(p => `- ${p.title} (${p.url})`).join('\n')}`;
    }

    let text = ''
    let lastError = ''

    // 단일 모델 시도 (이미 검증된 모델이므로 루프 불필요)
    try {
        const refererUrl = process.env.NEXT_PUBLIC_SITE_URL
            ? (process.env.NEXT_PUBLIC_SITE_URL.endsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : `${process.env.NEXT_PUBLIC_SITE_URL}/`)
            : 'http://localhost:3000/';

        const url = `https://generativelanguage.googleapis.com/${version}/models/${modelId}:generateContent?key=${trimmedKey}`;

        const response = await axios.post(url, {
            contents: [{
                parts: [{
                    text: `${systemPrompt}${internalLinkContext}\n\n위 지침을 따라 '${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘. 
본문은 반드시 5개 이상의 문단으로 구성하고, 독자에게 유용하고 상세한 정보를 제공하는 SEO 최적화된 글이어야 해. 분량은 가급적 1000자 이상으로 풍부하게 작성해줘.
절대로 <h1> 태그를 사용하지 마. 제목은 이미 글 상단에 있으므로 본문에는 <h2>, <h3>, <h4> 태그만 사용해야 해.
또한, 이 글과 관련된 **영어 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 배열로 제공해줘. (LoremFlickr 검색용)
글의 주제를 대표하는 **핵심 키워드 3~5개**를 'tags' 필드에 리스트 형태로 포함해줘.
반드시 JSON 형식 {"title": "...", "content": "...", "imageKeywords": ["keyword1", "keyword2", ...], "tags": ["tag1", "tag2", ...]}으로만 답변하고, JSON 외의 텍스트는 절대 포함하지 마.`
                }]
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': refererUrl
            },
            timeout: 180000 // 생성 시간 고려하여 타임아웃 대폭 증대 (3분)
        })

        text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } catch (err: any) {
        const errMsg = err.response?.data?.error?.message || err.message
        console.warn(`Gemini Generation [${modelId}] failed:`, errMsg)
        lastError = errMsg

        if (errMsg.includes('referrer') || (err.response?.status === 403)) {
            lastError = `API 키 리퍼러 차단됨. (사용된 Referer: ${process.env.NEXT_PUBLIC_SITE_URL || 'localhost'}) 구글 콘솔 확인 필요.`
        }
    }

    if (!text) {
        throw new Error(`Gemini 콘텐츠 생성 실패 (${modelId}): ${lastError}`)
    }

    // JSON 응답 정제 (2중 안전장치)
    const cleanedText = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
    try {
        return JSON.parse(cleanedText || '{}')
    } catch (e) {
        // 완전한 JSON이 아닐 경우 최소한의 구조 생성
        return { title: targetKeyword, content: text }
        // 완전한 JSON이 아닐 경우 최소한의 구조 생성
        return { title: targetKeyword, content: text }
    }
}

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
    // <ul> 감싸는 건 복잡하므로 일단 <li>로만 변환하거나, 
    // 간단히 줄바꿈을 <br>로 처리하는 등 최소한의 조치
    html = html.replace(/^\-\s+(.*$)/gim, '<li>$1</li>');

    return html;
}

/**
 * piAPI (FLUX)를 사용하여 이미지를 생성하고 결과를 가져옵니다.
 */
export async function generateFluxImage(apiKey: string, prompt: string) {
    const trimmedKey = apiKey.trim();
    const headers = { 'X-API-Key': trimmedKey, 'Content-Type': 'application/json' };

    console.log(`[Flux] Starting generation with prompt: "${prompt.substring(0, 50)}..."`);

    // 1. 작업 생성
    const taskRes = await axios.post('https://api.piapi.ai/api/v1/task', {
        model: 'Qubico/flux1-schnell',
        task_type: 'txt2img',
        input: {
            prompt: prompt,
            width: 1024,
            height: 1024
        }
    }, { headers });

    const taskId = taskRes.data?.data?.task_id;
    if (!taskId) throw new Error('FLUX 작업 생성에 실패했습니다. (Task ID 없음)');

    console.log(`[Flux] Task Created: ${taskId}`);

    // 2. 결과 폴링 (최대 60초)
    for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 5000)); // 5초 대기
        const statusRes = await axios.get(`https://api.piapi.ai/api/v1/task/${taskId}`, { headers });
        const task = statusRes.data?.data;

        if (task.status === 'completed') {
            console.log(`[Flux] Task Completed: ${taskId}`);
            return task.output?.image_url || task.output?.images?.[0] || '';
        }
        if (task.status === 'failed') {
            console.error(`[Flux] Task Failed: ${taskId}`, task.error);
            throw new Error(`FLUX 이미지 생성 실패 (Task ID: ${taskId}): ${task.error?.message || '알 수 없는 오류'}`);
        }
    }

    throw new Error(`FLUX 이미지 생성 시간 초과 (60초, Task ID: ${taskId})`);
}

/**
 * 텍스트 기반 썸네일(500x500)을 생성합니다. (단색 배경 + 한글 제목 + 테두리)
 */
export async function generateThumbnail(text: string): Promise<Buffer> {
    const width = 500;
    const height = 500;

    // 랜덤 파스텔 배경 & 대비되는 진한 테두리 색상
    const hue = Math.floor(Math.random() * 360);
    const bgColor = `hsl(${hue}, 70%, 85%)`;
    const borderColor = `hsl(${hue}, 80%, 30%)`;

    // Font loading
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf');
    const fontData = readFileSync(fontPath);

    const element = createElement('div', {
        style: {
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        }
    }, [
        // Border Container
        createElement('div', {
            style: {
                position: 'absolute',
                top: 15,
                left: 15,
                right: 15,
                bottom: 15,
                border: `15px solid ${borderColor}`,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }
        }, [
            // Text
            createElement('div', {
                style: {
                    color: borderColor,
                    fontSize: 45,
                    fontWeight: 900,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    lineHeight: 1.3,
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }
            }, text)
        ])
    ]);

    const svg = await satori(element, {
        width,
        height,
        fonts: [
            {
                name: 'NanumGothic',
                data: fontData,
                weight: 700,
                style: 'normal',
            },
        ],
    });

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * 워드프레스 미디어 라이브러리에 이미지를 업로드합니다.
 */
export async function uploadToWordPress(site: any, imageBuffer: Buffer, filename: string): Promise<{ id: number, url: string }> {
    try {
        const response = await axios.post(`${site.url}/wp-json/wp/v2/media`, imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename=${encodeURIComponent(filename)}.png`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            auth: {
                username: site.username,
                password: site.apiToken
            },
            timeout: 60000
        });
        return { id: response.data.id, url: response.data.source_url };
    } catch (error: any) {
        console.error('WP Upload Failed:', error.response?.data || error.message);
        throw new Error(`워드프레스 이미지 업로드 실패: ${error.response?.data?.message || error.message}`);
    }
}

/**
 * 자동화 작업 실행 전담 로직 (Auth Check 없음 - Cron에서 사용)
 */
export async function processAutomationJob(jobId: string) {
    try {
        // 여기서 jobId만으로 Job 검색 (userId 검증 없음 - 시스템 실행)
        const job = await prisma.automationJob.findUnique({
            where: { id: jobId },
            include: { site: true, keywordGroup: true, prompt: true, user: true }
        })

        if (!job) return { success: false, error: '작업 데이터를 찾을 수 없습니다.' }
        if (!job.user) return { success: false, error: '작업 소유자를 찾을 수 없습니다.' }

        const user = job.user;
        // User Settings는 별도 필드가 아닌 user.settings (JSON)에 있음
        const settings = (user as any).settings || {}

        const keywords = ((job as any).keywords && (job as any).keywords.length > 0)
            ? (job as any).keywords
            : (job.keywordGroup?.keywords as string[] || [])

        if (!keywords || keywords.length === 0) return { success: false, error: '사용 가능한 키워드가 없습니다.' }

        const targetKeyword = keywords[Math.floor(Math.random() * keywords.length)]

        const log = await prisma.postLog.create({
            data: { userId: user.id, jobId: job.id, keyword: targetKeyword, status: 'PROCESSING' }
        })

        let title = ''
        let content = ''
        let aiResult: any = {}; // AI 결과 저장 (키워드 참조용)
        const aiModel = (job as any).aiModel || 'GPT4O'
        const systemPrompt = job.prompt?.content || 'SEO 블로거로서 글을 작성해줘.'

        // --- [1단계] 해시태그 추출 (새 글의 태그/라벨용) ---
        const hashtags = Array.from(new Set([
            ...extractHashtags(systemPrompt),
            ...extractHashtags(targetKeyword)
        ]));
        console.log(`[Tag Config] Extracted Hashtags for new post: ${hashtags.join(', ') || 'none'}`);

        // --- [2단계] 내부 링크용 기존 글 발견 (사이트 내 랜덤 태그 검색) ---
        let wpTagIdsForNewPost: number[] = [];
        let existingPosts: any[] = [];

        if (job.site.type === 'WORDPRESS') {
            // 새 글을 위한 태그 동기화 (ID 획득)
            if (hashtags.length > 0) {
                wpTagIdsForNewPost = await syncWordPressTags(job.site, hashtags);
            }

            // [발견 로직] 사이트의 전체 태그 중 랜덤하게 2개 선택하여 관련 글 가져오기
            console.log('[Internal Link] Searching for random tags on site for discovery...');
            const randomTags = await fetchRandomWordPressTags(job.site);
            if (randomTags.length > 0) {
                const discoveryTagIds = randomTags.map(t => t.id);
                existingPosts = await fetchPostsByTags(job.site, discoveryTagIds);
                console.log(`[Internal Link] Discovered ${existingPosts.length} posts via random tags: ${randomTags.map(t => t.name).join(', ')}`);
            }

            // 만약 태그가 없거나 관련 글을 못 찾았다면 최근 카테고리 글이라도 가져옴
            if (existingPosts.length === 0) {
                existingPosts = await fetchRecentCategoryPosts(job.site, (job as any).wpCategoryId);
                console.log(`[Internal Link] Fallback to recent category posts: ${existingPosts.length} found.`);
            }
        } else if (job.site.type === 'BLOGSPOT') {
            // 블로거 라벨 기반 발견
            const randomLabels = await fetchRandomBloggerLabels(job.site);
            if (randomLabels.length > 0) {
                existingPosts = await fetchBloggerPostsByLabels(job.site, randomLabels);
                console.log(`[Internal Link] Discovered ${existingPosts.length} Blogger posts via random labels: ${randomLabels.join(', ')}`);
            }

            if (existingPosts.length === 0) {
                existingPosts = await fetchRecentCategoryPosts(job.site);
                console.log(`[Internal Link] Fallback to recent Blogger posts.`);
            }
        }

        if (aiModel === 'GPT4O') {
            const apiKey = settings.openaiApiKey
            const openai = new OpenAI({ apiKey })

            // 내부 링크 정보 구성 (AI에게 필수 지시)
            let internalLinkContext = '';
            if (existingPosts.length > 0) {
                // 상위 2개 글만 사용하여 정확성 높임
                const linkTargets = existingPosts.slice(0, 2);
                internalLinkContext = `\n\n[내부 링크 생성 필수 지침]: 
당신은 현재 작성 중인 글과 연관 지을 수 있는 사이트 내 기존 포스팅 정보를 가지고 있습니다. 
SEO 지수를 높이기 위해, 아래 링크들 중 최소 1~2개를 본문의 가장 적절한 위치에 자연스러운 문장으로 녹여내어 <a href="URL">제목</a> 형태의 HTML 앵커 텍스트로 삽입해주세요. 
단순 나열이 아닌, 문맥 속에서 해당 글을 소개하는 방식을 사용하세요:
${linkTargets.map((p: any) => `- ${p.title} (${p.url})`).join('\n')}`;
            }

            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: `당신은 SEO에 특화된 10년 경력의 전문 블로그 작가입니다. 독자가 궁금해하는 정보를 깊이 있게 분석하고, 매우 상세하고 친절한 어조로 글을 작성해야 합니다. 단순한 요약이 아닌, 독자에게 실질적인 도움이 되는 가치 있는 콘텐츠를 생산하세요. ${systemPrompt}${internalLinkContext}` },
                    {
                        role: "user", content: `'${targetKeyword}' 주제로 완벽한 블로그 포스팅을 작성해줘. 다음 지침을 엄격히 준수하라:

1. [필수 분량]: 공백 제외 최소 2500자 이상 작성할 것. 내용이 짧거나 피상적이면 절대 안 됨.
2. [구성 요소]:
   - 매력적인 제목 (클릭을 유도하는 후킹 제목)
   - 서론: 독자의 문제 제기 및 공감, 글을 읽어야 하는 이유 (300자 이상)
   - 본론: 최소 5개 이상의 상세 소주제(h2/h3). 각 소주제는 깊이 있는 분석과 예시, 통계, 전문가 의견 등을 포함하여 500자 이상 서술할 것.
   - 결론: 핵심 요약 및 독자의 행동 유도 (Call to Action).
   - FAQ: 자주 묻는 질문 3~4개와 그에 대한 명확한 답변.
3. [형식 및 스타일]:
   - 반드시 HTML 태그(<p>, <h3>, <ul>, <li>, <strong>, <blockquote> 등)를 사용하여 가독성을 극대화할 것.
   - **절영코 <h1> 태그를 본문에 쓰지 말 것.** (제목과 중복됨). <h2>부터 시작할 것.
   - 문체: 친근하고 전문적인 '해요체' 사용.
   - 내용 중 '${targetKeyword}' 키워드를 자연스럽게 8회 이상 포함할 것.
   - [반드시 준수할 포맷 규칙]:
   - **반드시** 순수한 JSON만 반환할 것.
   - **마크다운(Markdown) 문법을 절대 본문에 포함하지 마시오.** (예: ###, **, - 등 금지)
   - 모든 제목과 강조는 오직 HTML 태그(h2, h3, strong)로만 작성해야 함. 만약 마크다운이 발견되면 시스템 오류로 처리됨.
   - 키워드와 연관된 **영어 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 포함할 것.
   - 키워드와 연관된 **영어 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 포함할 것.
   - 글의 주제를 대표하는 **핵심 키워드 3~5개**를 'tags' 필드에 리스트 형태로 포함할 것.
   - 예시: {"title": "...", "content": "...", "imageKeywords": ["tax", "office", "..."], "tags": ["자산관리", "노후대비", "절세비법"]}` }
                ],
                max_tokens: 4096,
                response_format: { type: "json_object" }
            })
            let rawContent = completion.choices[0].message.content || '{}';
            // 마크다운 코드 블록 제거
            rawContent = rawContent.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

            aiResult = JSON.parse(rawContent)
            title = aiResult.title || aiResult.subject || aiResult.header || targetKeyword
            content = convertMarkdownToHtml(aiResult.content || aiResult.body || aiResult.text || aiResult.article || targetKeyword)

            if (content === targetKeyword && completion.choices[0].message.content) {
                content = completion.choices[0].message.content;
            }
        } else {
            const apiKey = settings.geminiApiKey
            if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
            aiResult = await generateGeminiContent(apiKey, systemPrompt, targetKeyword, existingPosts)
            title = aiResult.title || targetKeyword
            content = convertMarkdownToHtml(aiResult.content || targetKeyword)
        }
        
        const aiGeneratedTags = aiResult.tags || aiResult.keywords || [];
        
        // --- [발행 전 최종 태그 추출 (AI 생성 태그 + 본문 해시태그)] ---
        const finalHashtags = Array.from(new Set([
            ...hashtags,
            ...aiGeneratedTags,
            ...extractHashtags(title),
            ...extractHashtags(content)
        ]));
        
        if (job.site.type === 'WORDPRESS' && finalHashtags.length > 0) {
            wpTagIdsForNewPost = await syncWordPressTags(job.site, finalHashtags);
        }
        // 블로거는 별도 동기화 없이 hashtags 배열을 그대로 사용합니다 (아래 publish logic에서 finalHashtags 사용)

        // --- 이미지 생성 및 삽입 로직 ---
        const imageSource = (job as any).imageSource || 'NONE'
        const imageCount = (job as any).imageCount || 1
        let featuredMediaId = 0
        let imagesGenerated = 0 // 과금용 카운터

        const $ = cheerio.load(content);
        const headings = $('h2, h3');

        // 헤딩태그가 없으면 이미지 생성 안 함 (요구사항)
        // 헤딩태그가 없으면 이미지 생성 안 함 (요구사항)
        if (headings.length > 0 && imageSource !== 'NONE') {

            // 삽입 규칙 정의 (Index는 0부터 시작)
            // 1번(i=1): 1번째(h=0) 비포
            // 2번(i=2): 3번째(h=2) 애프터
            // 3번(i=3): 4번째(h=3) 애프터
            // 4번(i=4): 5번째(h=4) 애프터
            // 5번(i=5): 6번째(h=5) 애프터
            const insertionRules = [
                { imgIdx: 1, headIdx: 0, pos: 'before' },
                { imgIdx: 2, headIdx: 2, pos: 'after' },
                { imgIdx: 3, headIdx: 3, pos: 'after' },
                { imgIdx: 4, headIdx: 4, pos: 'after' },
                { imgIdx: 5, headIdx: 5, pos: 'after' },
            ];

            for (let i = 1; i <= imageCount; i++) {
                // 현재 이미지 순번에 맞는 규칙 찾기
                const rule = insertionRules.find(r => r.imgIdx === i);
                if (!rule) continue; // 규칙 범위 밖(예: 6개 이상)이면 패스 (현재 UI는 5개 제한이므로 발생 안함)

                // 헤딩 태그 존재 여부 확인
                if (headings.length <= rule.headIdx) {
                    console.warn(`Image ${i} skipped: Heading index ${rule.headIdx} not found (Total headings: ${headings.length})`);
                    continue; // 해당 위치에 헤딩이 없으면 건너뜀
                }

                const targetHeading = $(headings[rule.headIdx]);

                // 이미지 생성 진행
                let imageUrl = '';
                let success = false;

                // 1번 이미지 (썸네일) 특별 처리
                if (i === 1 && job.site.type === 'WORDPRESS') {
                    try {
                        // 제목 텍스트로 썸네일 생성
                        const thumbBuffer = await generateThumbnail(title || targetKeyword);
                        const uploaded = await uploadToWordPress(job.site, thumbBuffer, `${targetKeyword}-thumb-${Date.now()}`);
                        imageUrl = uploaded.url;
                        featuredMediaId = uploaded.id;
                        success = true;
                    } catch (e) {
                        console.warn('WP/Thumbnail Error:', e);
                    }
                }
                // 1번 이미지 (썸네일) 특별 처리 완료

                // 2. SCRAP (멀티 프로바이더)
                if (!imageUrl && imageSource === 'SCRAP') {
                    // AI 키워드 또는 기본 키워드 사용
                    const searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                        ? aiResult.imageKeywords[i - 1]
                        : (targetKeyword.split(' ')[0] || 'korea');

                    // 멀티 프로바이더 검색 시도
                    imageUrl = await fetchRandomImage(settings, searchKeyword, i);

                    // 만약 실패하거나 키 설정이 없으면 기존 LoremFlickr Fallback
                    if (!imageUrl) {
                        const w = i === 1 ? 768 : 768;
                        const h = i === 1 ? 512 : 512;
                        imageUrl = `https://loremflickr.com/${w}/${h}/${encodeURIComponent(searchKeyword)}?lock=${Math.floor(Math.random() * 100000) + i}&random=${Date.now()}${i}`
                    }
                    success = true;
                }

                // 3. 1번인데 WP가 아니거나 실패, 또는 2번 이상인 경우 (DALLE/FLUX)
                if (!imageUrl) {
                    try {
                        if (imageSource === 'DALLE') {
                            const openai = new OpenAI({ apiKey: settings.openaiApiKey })
                            const imgPrompt = i === 1 ? `${targetKeyword} minimal vector art` : `${targetKeyword} detailed photo ${i}`;
                            const image = await openai.images.generate({ model: "dall-e-3", prompt: imgPrompt, size: "1024x1024" })
                            imageUrl = image.data?.[0]?.url || ''
                            if (imageUrl) success = true;
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

                if (imageUrl) {
                    if (success) imagesGenerated++; // 실제 성공한 횟수 카운트

                    const alt = `${targetKeyword} ${i > 1 ? i : ''}`;
                    // CSS로 사이즈 강제 (원본 해상도 유지하되 표시는 요구사항대로)
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

        let postUrl = ''
        if (job.site.type === 'WORDPRESS') {
            const targetStatus = (job as any).postStatus || 'publish';
            const payload: any = {
                title, content, status: 'draft', // 1단계: 일단 임시저장
                categories: (job as any).wpCategoryId ? [(job as any).wpCategoryId] : [],
                tags: wpTagIdsForNewPost // 추출된 태그 ID들 추가
            };
            if (featuredMediaId > 0) {
                payload.featured_media = featuredMediaId;
            }

            const res = await axios.post(`${job.site.url}/wp-json/wp/v2/posts`, payload, {
                auth: { username: job.site.username || '', password: job.site.apiToken || '' },
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            })
            postUrl = res.data.link

            // 2단계: 즉시 발행인 경우 상태 업데이트
            if (targetStatus === 'publish') {
                const pubRes = await axios.post(`${job.site.url}/wp-json/wp/v2/posts/${res.data.id}`, { status: 'publish' }, {
                    auth: { username: job.site.username || '', password: job.site.apiToken || '' },
                    timeout: 60000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                })
                postUrl = pubRes.data.link
            }
        } else if (job.site.type === 'BLOGSPOT') {
            const blogId = job.site.username || job.site.url.split('blogId=')[1] || job.site.url.replace(/[^0-9]/g, '');
            const postToBlogger = async (token: string) => {
                return axios.post(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
                    title: title,
                    content: content,
                labels: finalHashtags // 추출된 모든 해시태그를 라벨로 추가
            }, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            };

            try {
                const res = await postToBlogger(job.site.apiToken || '');
                postUrl = res.data.url;
            } catch (err: any) {
                if (err.response?.status === 401 && (job.site as any).refreshToken) {
                    const newToken = await refreshBloggerToken(job.site, settings.googleClientId, settings.googleClientSecret);
                    const res = await postToBlogger(newToken);
                    postUrl = res.data.url;
                } else {
                    throw err;
                }
            }
        }


        // 토큰 비용 계산
        let globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } })
        const costs = globalSettings || { costPerPost: 1, costPerScrap: 1, costPerAIImage: 2 }

        let tokensToDeduct = costs.costPerPost
        if (imagesGenerated > 0) {
            if (imageSource === 'SCRAP') {
                tokensToDeduct += (costs.costPerScrap * imagesGenerated);
            } else {
                tokensToDeduct += (costs.costPerAIImage * imagesGenerated);
            }
        }

        // 실행 전 토큰 잔액 체크 (안전장치)
        const currentUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (!currentUser || currentUser.tokenBalance < tokensToDeduct) {
            console.warn(`User ${user.id} has insufficient tokens for deduction. Required: ${tokensToDeduct}, Available: ${currentUser?.tokenBalance || 0}`);
        }

        await prisma.postLog.update({
            where: { id: log.id },
            data: {
                status: 'SUCCESS',
                postUrl,
                title,
                tokensUsed: tokensToDeduct
            }
        })

        await prisma.user.update({
            where: { id: user.id },
            data: { tokenBalance: { decrement: tokensToDeduct } } as any
        })

        // 트랜잭션 기록 추가
        await prisma.transaction.create({
            data: {
                userId: user.id,
                amount: -tokensToDeduct,
                description: `자동화 작업 실행 (${job.name}) - 이미지 ${imagesGenerated}장`,
                type: 'USAGE'
            }
        })


        revalidatePath('/dashboard')
        return { success: true, postUrl }
    } catch (error: any) {
        console.error('자동화 실행 실패:', error)
        return { success: false, error: error.message }
    }
}
