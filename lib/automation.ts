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

// Helper to clean and parse JSON from AI responses
function cleanAndParseJson(text: string): any {
    if (!text) return {};

    // 1. Remove markdown code blocks (```json ... ```)
    let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

    // 2. Replace smart quotes with standard quotes
    cleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

    // 3. Find the first '{' and last '}' to isolate JSON object
    const firstOpen = cleaned.indexOf('{');
    const lastClose = cleaned.lastIndexOf('}');

    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        cleaned = cleaned.substring(firstOpen, lastClose + 1);
    }

    try {
        const parsed = JSON.parse(cleaned);
        // HTML 태그 정제 (<html>, <head>, <body> 제거)
        if (parsed.content) {
            parsed.content = parsed.content
                .replace(/<!DOCTYPE[^>]*>/ig, '')
                .replace(/<html[^>]*>/ig, '')
                .replace(/<\/html>/ig, '')
                .replace(/<head>[\s\S]*?<\/head>/ig, '')
                .replace(/<body[^>]*>/ig, '')
                .replace(/<\/body>/ig, '')
                .trim();
        }
        return parsed;
    } catch (e) {
        // console.warn('JSON Parse Failed, attempting manual cleanup', e);
        // Fallback: Return text as content if parsing fails completely
        let content = text;
        content = content
            .replace(/<!DOCTYPE[^>]*>/ig, '')
            .replace(/<html[^>]*>/ig, '')
            .replace(/<\/html>/ig, '')
            .replace(/<head>[\s\S]*?<\/head>/ig, '')
            .replace(/<body[^>]*>/ig, '')
            .replace(/<\/body>/ig, '')
            .trim();

        return { title: '', content: content, imageKeywords: [] };
    }
}

/**
 * 썸네일 텍스트를 안전하게 정제합니다. (최대 12자)
 */
/**
 * 썸네일 텍스트를 안전하게 정제합니다. (최대 12자)
 */
export function getSafeThumbnailText(aiThumbText: string | undefined, title: string, keyword: string): string {
    let candidate = aiThumbText;

    // 1. 기본 정제
    if (candidate) {
        candidate = candidate.replace(/['"]/g, '').trim();
        if (candidate.endsWith('.')) candidate = candidate.slice(0, -1);
        // "제목: ..." 같은 접두어 제거
        candidate = candidate.replace(/^(제목|썸네일|요약):\s*/, '');
    }

    // 2. 유효성 검사 (매우 엄격하게 12자 제한)
    // 썸네일은 시각적 임팩트가 중요하므로 짧아야 함
    const isTooLong = !candidate || candidate.length > 13;
    const isSameAsTitle = candidate && title && (candidate === title || title.includes(candidate));

    if (candidate && !isTooLong && !isSameAsTitle) {
        return candidate;
    }

    // 3. Fallback Strategies (제목 사용 금지)

    // 전략 A: 키워드가 짧으면 키워드 사용 (가장 깔끔)
    if (keyword.length <= 10) return keyword;

    // 전략 B: 키워드도 길면, 키워드의 첫 어절만 사용
    const firstKeyword = keyword.split(' ')[0];
    if (firstKeyword.length <= 10) return firstKeyword;

    // 최후의 수단: 그냥 키워드를 10자에서 자름 (제목 절대 사용 안 함)
    return keyword.substring(0, 10);
}

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

export async function generateGeminiContent(apiKey: string, systemPrompt: string, targetKeyword: string) {
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
                    text: `${systemPrompt}\n\n위 지침을 따라 '${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘. 
본문은 반드시 5개 이상의 문단으로 구성하고, 독자에게 유용하고 상세한 정보를 제공하는 SEO 최적화된 글이어야 해. 분량은 가급적 1000자 이상으로 풍부하게 작성해줘.
본문은 반드시 5개 이상의 문단으로 구성하고, 독자에게 유용하고 상세한 정보를 제공하는 SEO 최적화된 글이어야 해. 분량은 가급적 1000자 이상으로 풍부하게 작성해줘.
절대로 <h1>, <html>, <head>, <body>, <!DOCTYPE> 태그를 사용하지 마. 오직 본문 내용(<p>, <h2> 등)만 반환해야 해.
제목은 이미 글 상단에 있으므로 본문에는 <h2>, <h3>, <h4> 태그만 사용해야 해.
또한, 이 글과 관련된 **영어 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 배열로 제공해줘. (LoremFlickr 검색용)
마지막으로, 썸네일 이미지에 들어갈 **10자 이내의 클릭을 부르는 자극적인 문구**를 'thumbnailText' 필드에 제공해줘. \n**주의: 절대 제목을 그대로 쓰지 마.** 독자가 클릭하고 싶게 만드는 "낚시성 멘트"나 "충격적인 질문" 형태로 짧게(단어 위주). (예: "저속노화의 충격 진실", "절대 먹지 마세요")
반드시 JSON 형식 {"title": "...", "content": "...", "imageKeywords": ["..."], "thumbnailText": "..."}으로만 답변하고, JSON 외의 텍스트는 절대 포함하지 마.`
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

    // JSON 응답 정제 (2중 안전장치 + 스마트 따옴표 처리)
    return cleanAndParseJson(text);
}

/**
 * Claude (Opus)를 사용하여 콘텐츠를 생성합니다.
 */
export async function generateClaudeContent(apiKey: string, systemPrompt: string, targetKeyword: string) {
    // 동적 import로 SDK 로드 (서버 사이드에서만 필요)
    const { Anthropic } = await import('@anthropic-ai/sdk');

    const anthropic = new Anthropic({
        apiKey: apiKey,
    });

    console.log(`[Claude] Starting generation for: "${targetKeyword}" with Opus`);

    try {
        const msg = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 4096,
            system: `${systemPrompt}\n\n반드시 다음 JSON 형식으로만 응답하세요: {"title": "...", "content": "...", "imageKeywords": ["keyword1", ...], "thumbnailText": "..."}`,
            messages: [
                {
                    role: "user",
                    content: `'${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘.
1. 본문은 5개 이상의 문단, 2000자 이상으로 풍부하게 작성.
1. 본문은 5개 이상의 문단, 2000자 이상으로 풍부하게 작성.
2. <h1>, <html>, <head>, <body> 태그 사용 금지. 오직 본문 태그(<h2>, <p> 등)만 사용.
3. SEO에 최적화된 유용한 정보 위주로 작성.
4. **반드시 JSON 형식만 반환**하고, 마크다운 코드 블록(\`\`\`json)이나 사족을 달지 마시오.
5. 'imageKeywords' 필드에는 이미지 검색용 영문 키워드 5개를 배열로 포함.
6. 'thumbnailText' 필드에는 썸네일용 10자 이내의 **클릭을 부르는 자극적인 문구** 포함. (**절대 제목과 같으면 안 됨**. 예: "이것만 알면 끝", "충격적인 결말")`
                }
            ]
        });

        const textBlock = msg.content[0];
        if (textBlock.type !== 'text') {
            throw new Error('Claude 응답이 텍스트 형식이 아닙니다.');
        }

        let text = textBlock.text;

        // JSON 정제
        return cleanAndParseJson(text);

    } catch (error: any) {
        console.error('Claude API Error:', error);
        throw new Error(`Claude 콘텐츠 생성 실패: ${error.message}`);
    }
}

/**
 * GPT-4o를 사용하여 콘텐츠를 생성합니다.
 */
export async function generateGPTContent(apiKey: string, systemPrompt: string, targetKeyword: string, model: string = "gpt-5-mini") {
    const openai = new OpenAI({ apiKey })
    const isNewModel = model.includes('gpt-5') || model.startsWith('o1') || model.startsWith('o3');

    const params: any = {
        model: model,
        messages: [
            {
                role: "system", content: `당신은 블로그 글을 생성하는 AI입니다. 사용자의 요청에 따라 자유롭게 글을 작성하되, 시스템 연동을 위해 다음 **기술적 제약사항**만 반드시 지켜주세요.

[기술적 필수 제약사항]:
1. **형식**: 반드시 JSON 형식으로만 응답해야 합니다. (JSON 파싱 실패 시 시스템 오류 발생)
2. **태그 제한**: <h1>, <html>, <head>, <body> 태그는 사용 금지입니다. (<h2>, <h3>, <p> 등 사용 권장)
3. **필수 필드**:
   - title: 글 제목
   - content: 글 본문 (HTML 태그 포함)
   - imageKeywords: 이미지 검색용 영어 키워드 5개 (배열)
   - thumbnailText: 썸네일용 텍스트 (10자 이내)

그 외의 **글의 스타일, 어조, 길이, 구성** 등은 오직 아래 **사용자(User)의 요청**을 최우선으로 따르세요. 시스템이 강제하는 문체나 형식은 없습니다.`
            },
            {
                role: "user", content: `'${targetKeyword}' 주제로 블로그 포스팅을 작성해줘.

[사용자 요청 사항]:
${systemPrompt || '별도의 추가 지침 없음. 자유롭게 작성.'}

[필수 포맷 가이드]:
- **반드시** 순수한 JSON만 반환할 것.
- **마크다운(Markdown) 문법을 절대 본문에 포함하지 마시오.** (예: ###, **, - 금지)
- 키워드와 연관된 **영어 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 포함할 것.
- 썸네일 이미지에 들어갈 **10자 이내의 문구**를 'thumbnailText' 필드에 포함할 것.
- 예시: { "title": "...", "content": "...", "imageKeywords": ["..."], "thumbnailText": "..." }`
            }
        ],
    };

    if (isNewModel) {
        // GPT-5/o1 models use 'reasoning_tokens' which consume the token budget. 
        // Increasing to max possible (60,000) to ensure thorough reasoning and adherence to complex instructions.
        params.max_completion_tokens = 60000;
        // params.response_format = { type: "json_object" }; // Keep disabled for new reasoning models (often unsupported or redundant)
    } else {
        params.max_tokens = 4096;
        params.response_format = { type: "json_object" };
    }

    let completion: any;
    try {
        console.log(`Sending request to OpenAI with model: ${model}`);
        completion = await openai.chat.completions.create(params)
        console.log(`OpenAI Response for ${model}: `, JSON.stringify(completion, null, 2)); // FULL DEBUG LOG
    } catch (e: any) {
        // gpt-5 failed (e.g. 400 Bad Request if params invalid). Fallback to gpt-4o immediately if it was gpt-5
        if (isNewModel) {
            console.warn(`GPT - 5 generation failed with error: ${e.message}. Falling back to GPT - 4o - mini.`);
            try {
                // Try GPT-4o-mini first as a fast fallback
                return await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o-mini');
            } catch (innerE: any) {
                console.warn(`GPT - 4o - mini fallback failed: ${innerE.message}. Trying GPT - 4o.`);
                return await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o');
            }
        }
        // If it's not a new model (e.g. gpt-4o failing), return the error as content so user sees it
        console.error(`GPT Content Generation Error(${model}): `, e);
        return {
            title: `Error(${model})`,
            content: `< h3 > AI 생성 오류 발생 < /h3><p>모델: ${model}</p > <p>에러 메시지: ${e.message || JSON.stringify(e)} </p>`,
            imageKeywords: [],
            thumbnailText: 'Error'
        };
    }

    let rawContent = completion.choices[0]?.message?.content || '';
    const finishReason = completion.choices[0]?.finish_reason;
    console.log(`Raw content from ${model}:`, rawContent);
    console.log(`Finish reason from ${model}:`, finishReason);

    // If GPT-5 returned empty content (filtered or error), fallback to GPT-4o-mini
    if (isNewModel && (!rawContent || rawContent.length < 50)) {
        console.warn(`GPT-5 returned empty or too short content (${rawContent.length} chars). Falling back to GPT-4o-mini.`);
        return await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o-mini');
    }

    if (!rawContent) {
        return {
            title: `Empty Content (${model})`,
            content: `<h3>AI 응답이 비어있습니다.</h3><p>모델: ${model}</p>`,
            imageKeywords: [],
            thumbnailText: 'Empty'
        };
    }

    return cleanAndParseJson(rawContent);
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
 * 텍스트 기반 썸네일(500x500)을 생성합니다. (다양한 템플릿 및 컬러 팔레트 적용)
 */
/**
 * 텍스트 기반 썸네일(500x500)을 생성합니다. (다양한 템플릿 및 컬러 팔레트 적용)
 */
export async function generateThumbnail(text: string): Promise<Buffer> {
    const width = 500;
    const height = 500;

    // 1. Curated Color Palettes (Background, Text, Accent/Border)
    const palettes = [
        { bg: '#f0f9ff', text: '#0369a1', accent: '#0ea5e9' }, // Sky Blue
        { bg: '#fff7ed', text: '#c2410c', accent: '#f97316' }, // Orange
        { bg: '#fdf4ff', text: '#86198f', accent: '#d946ef' }, // Fuchsia
        { bg: '#f0fdf4', text: '#15803d', accent: '#22c55e' }, // Green
        // { bg: '#18181b', text: '#f4f4f5', accent: '#3b82f6' }, // Dark & Blue (REMOVED due to contrast issues)
        { bg: '#fff1f2', text: '#be123c', accent: '#f43f5e' }, // Rose
        { bg: '#fefce8', text: '#854d0e', accent: '#eab308' }, // Yellow
        { bg: '#f5f3ff', text: '#5b21b6', accent: '#8b5cf6' }, // Violet
    ];

    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const templateIdx = Math.floor(Math.random() * 4); // 0, 1, 2, 3

    // Font loading
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf');
    const fontData = readFileSync(fontPath);

    let element;

    // Template 1: Classic Border (기존 스타일 개선)
    if (templateIdx === 0) {
        element = createElement('div', {
            style: { display: 'flex', width: '100%', height: '100%', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', position: 'relative' }
        }, [
            createElement('div', {
                style: {
                    position: 'absolute', top: 20, left: 20, right: 20, bottom: 20,
                    border: `12px solid ${palette.accent}`, borderRadius: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }
            }, [
                createElement('div', {
                    style: {
                        color: palette.text, fontSize: 50, fontWeight: 900, textAlign: 'center',
                        wordBreak: 'keep-all', padding: '20px', lineHeight: 1.2
                    }
                }, text)
            ])
        ]);
    }
    // Template 2: Double Layer (겹친 박스 효과)
    else if (templateIdx === 1) {
        element = createElement('div', {
            style: { display: 'flex', width: '100%', height: '100%', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', position: 'relative' }
        }, [
            // Background Shape
            createElement('div', {
                style: {
                    position: 'absolute', top: 40, left: 40, width: '420px', height: '420px',
                    backgroundColor: palette.accent, borderRadius: 20, opacity: 0.3
                }
            }),
            // Foreground Box
            createElement('div', {
                style: {
                    position: 'relative', width: '400px', height: '400px',
                    backgroundColor: '#ffffff', borderRadius: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)', border: `4px solid ${palette.accent}`
                }
            }, [
                createElement('div', {
                    style: {
                        color: palette.text, fontSize: 48, fontWeight: 900, textAlign: 'center',
                        wordBreak: 'keep-all', padding: '15px', lineHeight: 1.2
                    }
                }, text)
            ])
        ]);
    }
    // Template 3: Circle Focus (원형 포인트)
    else if (templateIdx === 2) {
        element = createElement('div', {
            style: { display: 'flex', width: '100%', height: '100%', backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center', position: 'relative' }
        }, [
            createElement('div', {
                style: {
                    position: 'absolute', width: '450px', height: '450px', borderRadius: '50%',
                    border: `2px dashed ${palette.accent}`, opacity: 0.5
                }
            }),
            createElement('div', {
                style: {
                    width: '380px', height: '380px', borderRadius: '50%',
                    backgroundColor: palette.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
                }
            }, [
                createElement('div', {
                    style: {
                        color: '#ffffff', fontSize: 45, fontWeight: 900, textAlign: 'center',
                        wordBreak: 'keep-all', padding: '20px', lineHeight: 1.2
                    }
                }, text)
            ])
        ]);
    }
    // Template 4: Modern Minimal (심플 & 볼드)
    else {
        element = createElement('div', {
            style: { display: 'flex', width: '100%', height: '100%', backgroundColor: palette.text, alignItems: 'center', justifyContent: 'center', padding: '40px' }
        }, [
            createElement('div', {
                style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }
            }, [
                createElement('div', {
                    style: { height: '10px', width: '60px', backgroundColor: palette.accent, marginBottom: '20px', borderRadius: '5px' }
                }),
                createElement('div', {
                    style: {
                        color: '#ffffff', fontSize: 55, fontWeight: 900, textAlign: 'left',
                        wordBreak: 'keep-all', lineHeight: 1.1
                    }
                }, text)
            ])
        ]);
    }

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
    let logId: string | null = null;

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

        // 1. 로그 생성 (가장 먼저 수행하여 에러 추적 가능하게 함)
        const log = await prisma.postLog.create({
            data: { userId: user.id, jobId: job.id, keyword: targetKeyword, status: 'PROCESSING' }
        })
        logId = log.id;

        // 2. 실행 전 토큰 잔액 체크 (안전장치) - 에러 시 로그 업데이트를 위해 위로 이동
        // 예상 비용 계산
        let globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } })
        const costs = globalSettings || { costPerPost: 1, costPerScrap: 1, costPerAIImage: 2 }
        const imageSource = (job as any).imageSource || 'NONE'
        const imageCount = (job as any).imageCount || 1

        // 최소 예상 비용 (이미지 생성 수에 따라 달라질 수 있지만, 일단 최소치 혹은 Max치로 체크?)
        // 여기서는 기본 포스팅 비용만 먼저 체크하거나, 엄격하게 체크
        if (user.tokenBalance < costs.costPerPost) {
            throw new Error(`보유 토큰이 부족합니다. (보유: ${user.tokenBalance}, 필요: ${costs.costPerPost} 이상)`);
        }


        let title = ''
        let content = ''
        let aiResult: any = {}; // AI 결과 저장 (키워드 참조용)
        const aiModel = (job as any).aiModel || 'GPT4O'
        const systemPrompt = job.prompt?.content || 'SEO 블로거로서 글을 작성해줘.'

        if (aiModel === 'GEMINI') {
            if (!settings.geminiApiKey) throw new Error('Gemini API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateGeminiContent(settings.geminiApiKey, systemPrompt, targetKeyword)
        } else if (aiModel === 'CLAUDE') {
            if (!settings.anthropicApiKey) throw new Error('Claude API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateClaudeContent(settings.anthropicApiKey, systemPrompt, targetKeyword)
        } else if (aiModel === 'GPT5') {
            if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateGPTContent(settings.openaiApiKey, systemPrompt, targetKeyword, 'gpt-5-mini')
        } else {
            // Default: GPT4O
            if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateGPTContent(settings.openaiApiKey, systemPrompt, targetKeyword, 'gpt-4o')
        }

        title = aiResult.title || targetKeyword
        content = convertMarkdownToHtml(aiResult.content || targetKeyword)

        // --- 이미지 생성 및 삽입 로직 ---
        let featuredMediaId = 0
        let imagesGenerated = 0 // 과금용 카운터

        const $ = cheerio.load(content);
        const headings = $('h2, h3');

        // 헤딩태그가 없으면 이미지 생성 안 함 (요구사항)
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
                    // console.warn(`Image ${i} skipped...`);
                    continue;
                }

                const targetHeading = $(headings[rule.headIdx]);
                let imageUrl = '';
                let success = false;

                // 1번 이미지 (썸네일) 특별 처리
                if (i === 1 && job.site.type === 'WORDPRESS') {
                    try {
                        // 썸네일 텍스트 결정 (Strict Mode)
                        const safeThumbText = getSafeThumbnailText(aiResult.thumbnailText, title, targetKeyword);

                        // 디버깅용 로그 (서버 콘솔 확인 가능 시)
                        console.log(`[Thumbnail] Final Text: "${safeThumbText}" (Original: "${aiResult.thumbnailText}", Title: "${title}")`);

                        const thumbBuffer = await generateThumbnail(safeThumbText);
                        const uploaded = await uploadToWordPress(job.site, thumbBuffer, `${targetKeyword}-thumb-${Date.now()}`);
                        imageUrl = uploaded.url;
                        featuredMediaId = uploaded.id;
                    } catch (e) {
                        console.warn('WP/Thumbnail Error:', e);
                    }
                }

                // 2. SCRAP (멀티 프로바이더)
                if (!imageUrl && imageSource === 'SCRAP') {
                    const searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                        ? aiResult.imageKeywords[i - 1]
                        : (targetKeyword.split(' ')[0] || 'korea');

                    imageUrl = await fetchRandomImage(settings, searchKeyword, i);

                    if (!imageUrl) {
                        const w = i === 1 ? 768 : 768;
                        const h = i === 1 ? 512 : 512;
                        imageUrl = `https://loremflickr.com/${w}/${h}/${encodeURIComponent(searchKeyword)}?lock=${Math.floor(Math.random() * 100000) + i}&random=${Date.now()}${i}`
                    }
                    success = true;
                }

                // 3. DALLE / FLUX
                if (!imageUrl) {
                    try {
                        if (imageSource === 'DALLE') {
                            if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 없습니다.');
                            const openai = new OpenAI({ apiKey: settings.openaiApiKey })
                            const imgPrompt = i === 1 ? `${targetKeyword} minimal vector art` : `${targetKeyword} detailed photo ${i}`;
                            const image = await openai.images.generate({ model: "dall-e-3", prompt: imgPrompt, size: "1024x1024" })
                            imageUrl = image.data?.[0]?.url || ''
                            if (imageUrl) success = true;
                        } else if (imageSource === 'FLUX') {
                            if (!settings.piApiKey) throw new Error('PiAPI (FLUX) API 키가 없습니다.');
                            imageUrl = await generateFluxImage(settings.piApiKey, `${targetKeyword} blog image ${i}`)
                            if (imageUrl) success = true;
                        }
                    } catch (e) {
                        console.warn(`Image ${i} Generation Failed`, e);
                    }
                }

                if (imageUrl) {
                    if (success) imagesGenerated++;

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

        let postUrl = ''
        if (job.site.type === 'WORDPRESS') {
            const targetStatus = (job as any).postStatus || 'publish';
            const payload: any = {
                title, content, status: 'draft',
                categories: (job as any).wpCategoryId ? [(job as any).wpCategoryId] : []
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
                    content: content
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


        // 토큰 비용 계산 및 차감
        let tokensToDeduct = costs.costPerPost
        if (imagesGenerated > 0) {
            if (imageSource === 'SCRAP') {
                tokensToDeduct += (costs.costPerScrap * imagesGenerated);
            } else {
                tokensToDeduct += (costs.costPerAIImage * imagesGenerated);
            }
        }

        // 최종 잔액 체크 (이미지가 많이 생성되어 부족해질 수도 있음)
        // 하지만 이미 작업은 완료되었으므로 차감은 시도하고, 마이너스가 될 수도 있음 (혹은 Transaction에서 처리)
        // 여기서는 그냥 차감 진행

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
        const errorMessage = error.message || '알 수 없는 오류 발생';

        // 로그가 생성되었다면 실패 상태로 업데이트
        if (logId) {
            try {
                await prisma.postLog.update({
                    where: { id: logId },
                    data: {
                        status: 'FAILED',
                        errorMessage: errorMessage
                    }
                })
            } catch (updateErr) {
                console.error('로그 업데이트 실패:', updateErr)
            }
        }

        return { success: false, error: errorMessage }
    }
}
