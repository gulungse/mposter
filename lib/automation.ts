import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from 'openai'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { fetchRandomImage } from '@/lib/image_providers'
import sharp from 'sharp'
import satori from 'satori'
import { createElement } from 'react'
import { readFileSync } from 'fs'
import { join } from 'path'
import { calculateNextRun } from '@/lib/cron'
import { AIModel } from '@prisma/client'
import { MODEL_ID_MAP } from './ai-models'

/**
 * 생성된 제목에서 불필요한 접두어(그대, <, > 등)를 제거합니다.
 */
export function cleanTitle(title: string): string {
    if (!title) return '';
    // Normalize and remove common prefixes/symbols
    return title
        .replace(/^\[.*?\]\s*/, '') // Remove [Tags]
        .replace(/^(제목|썸네일|요약|그대):\s*/i, '') // Remove "제목:", "그대:" etc.
        .replace(/[<>]/g, '') // Remove < >
        .replace(/^["']|["']$/g, '') // Remove starting/ending quotes
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
}

// Helper to clean and parse JSON from AI responses
function cleanAndParseJson(text: string): any {
    if (!text) return {};

    // 1. Remove markdown code blocks (```json ... ```)
    let cleaned = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

    // Internal helper for parsing and final processing
    const parseAndFinalize = (jsonStr: string) => {
        const firstOpen = jsonStr.indexOf('{');
        const lastClose = jsonStr.lastIndexOf('}');

        if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
            jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
        }

        const parsed = JSON.parse(jsonStr);
        // HTML 태그 정제 (<html>, <head>, <body>, <style>, <script> 제거)
        if (parsed.content) {
            // AI가 이스케이프한 줄바꿈 복원
            let content = parsed.content.replace(/\\n/g, '\n');

            // cheerio를 사용하여 확실하게 body 내부만 추출
            const $ = cheerio.load(content);

            // 위험 태그 제거
            $('script, style, head, title, meta, link, iframe').remove();

            // body가 있으면 그 내부만, 없으면 전체에서 body/html 등 검색하여 제거
            const bodyHtml = $('body').html();
            parsed.content = (bodyHtml || $.html()).trim();
        }
        if (parsed.title) {
            parsed.title = cleanTitle(parsed.title);
        }
        return parsed;
    };

    // 1. 먼저 치환 없이 시도 (콘텐츠 내의 스마트 따옴표 보존을 위해)
    try {
        return parseAndFinalize(cleaned);
    } catch (e) {
        // 2. 실패 시 스마트 따옴표를 일반 따옴표로 치환하여 재시도 (구조 자체가 깨진 경우 대비)
        try {
            let retryCleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
            return parseAndFinalize(retryCleaned);
        } catch (e2) {
            // 3. 최후의 수단: Regex로 최소한 title과 content만이라도 추출 시도
            // (치환된 버전인 retryCleaned를 사용하여 매칭 확률 높임)
            let finalCleaned = cleaned.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
            const titleMatch = finalCleaned.match(/"title"\s*:\s*"([\s\S]*?)"/);
            const contentMatch = finalCleaned.match(/"content"\s*:\s*"([\s\S]*?)"/);

            if (titleMatch || contentMatch) {
                const title = titleMatch ? titleMatch[1].replace(/\\"/g, '"').replace(/\\n/g, ' ') : '';
                let content = contentMatch ? contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : text;

                // Failsafe cleaning for fallback
                const $ = cheerio.load(content);
                $('script, style, head, title, meta, link, iframe').remove();
                const bodyHtml = $('body').html();
                content = (bodyHtml || $.html()).trim();

                return { title: cleanTitle(title), content: content, imageKeywords: [], thumbnailText: '' };
            }

            // 최후의 최후 수단: 토큰 한계로 완전히 잘린 텍스트라고 판단되므로 (JSON 포맷 붕괴 등)
            // 비정상적인 미완성 글이 블로그에 발행되는 것을 100% 방지하기 위해 예외를 던집니다.
            throw new Error('AI 생성 토큰 제한(Max Tokens) 도달 또는 응답 붕괴 오류가 발생하여 안전을 위해 발행을 중단합니다. (글이 너무 깁니다)');
        }
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
        candidate = cleanTitle(candidate);
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
export async function refreshBloggerToken(site: any, legacyClientId?: string, legacyClientSecret?: string) {
    const refreshToken = site.refreshToken || (site as any).refreshToken;
    if (!refreshToken) throw new Error('Refresh Token이 없어 토큰을 갱신할 수 없습니다. 사이트를 다시 연결해 주세요.');

    const globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } });
    const finalClientId = globalSettings?.googleClientId || process.env.GOOGLE_CLIENT_ID;
    const finalClientSecret = globalSettings?.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;

    if (!finalClientId || !finalClientSecret) {
        throw new Error('토큰이 만료되었으나 자동 갱신을 위한 시스템 설정(Google Client ID/Secret)이 없습니다. 관리자에게 문의하세요.');
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

export async function generateGeminiContent(apiKey: string, systemPrompt: string, targetKeyword: string, model?: string, transcript?: string) {
    const trimmedKey = apiKey.trim()

    // 1. 사용 가능한 모델 목록 조회 (스마트 감지) - 모델이 전달되지 않았을 때만 수행하거나 검증용으로 사용
    const availableModels = await getAvailableGeminiModels(trimmedKey);
    const availableNames = availableModels.map((m: any) => m.name); // 예: ['models/gemini-1.5-flash', ...]
    console.log('Available Gemini Models:', availableNames);

    // 2. 모델 선택 로직
    let modelId = model;

    // 만약 모델이 전달되지 않았거나, 전달된 모델이 availableNames에 없는 경우 스마트 감지 시도
    if (!modelId || (availableNames.length > 0 && !availableNames.some((name: string) => name.includes(modelId!)))) {
        console.log(`Requested model [${modelId}] not found or not provided. Trying smart detection...`);
        let selectedModelName = availableNames.find((name: string) => name.includes('gemini-2.5-flash'))
            || availableNames.find((name: string) => name.includes('gemini-2.0-flash'))
            || availableNames.find((name: string) => name.includes('gemini-1.5-flash'))
            || availableNames.find((name: string) => name.includes('flash'));

        modelId = selectedModelName ? selectedModelName.replace('models/', '') : 'gemini-1.5-flash';
    }

    // 1.5/2.0/3.1 등 최신 모델은 v1beta 지원
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
                    text: `${systemPrompt}\n\n${transcript ? `[참고 데이터 - 유튜브 스크립트]:\n${transcript}\n\n위 스크립트 내용을 바탕으로 블로그 글을 작성해줘. ` : ''}위 지침을 따라 '${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘. 
본문은 반드시 5개 이상의 문단으로 구성하고, 독자에게 유용하고 상세한 정보를 제공하는 SEO 최적화된 글이어야 해. 분량은 가급적 1000자 이상으로 풍부하게 작성해줘.
절대로 <h1>, <html>, <head>, <body>, <!DOCTYPE>, <style>, <script> 태그를 사용하지 마. 본문에는 오직 문서 내용(<p>, <h2>, <ul>, <li> 등)만 포함해야 하며, 내부 CSS나 인라인 스타일도 금지야.
제목은 이미 글 상단에 있으므로 본문에는 <h2>, <h3>, <h4> 태그만 사용해야 해.
또한, 이 글의 각 주요 섹션과 어울리는 **매우 상세하고 묘사적인 영문 이미지 검색 키워드 5개**를 'imageKeywords' 필드에 배열로 제공해줘. (Unsplash, Pixabay 검색용)
단순한 단어(예: "coffee")가 아니라, 장면을 묘사하는 구체적인 표현(예: "minimalist coffee cup on wooden table warm morning light", "professional business meeting in modern office")을 사용해야 해. 'high quality', 'professional photography' 같은 수식어를 적절히 섞어줘.
마지막으로, 썸네일 이미지에 들어갈 **10자 이내의 클릭을 부르는 짧은 문구**를 'thumbnailText' 필드에 제공해줘. 
**주의: 제목과 다른 내용을 문구로 사용하세요.** 독자가 클릭하고 싶게 만드는 "짧은 강조 멘트"나 "궁금증을 유발하는 질문" 형태로 핵심 단어 위주로 작성해줘. (예: "저속노화의 충격 진실", "절대 먹지 마세요")
반드시 JSON 형식 {"title": "...", "content": "...", "imageKeywords": ["..."], "thumbnailText": "..."}으로만 답변하고, JSON 외의 텍스트는 절대 포함하지 마.
**중요: 제목('title')은 제공된 원본 제목을 그대로 쓰지 말고, 독창적이고 매력적인 새로운 제목으로 반드시 패러프레이징해서 작성해줘. 어떠한 접두어나 불필요한 특수기호(<, > 등)를 절대 붙이지 마세요.**`
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
        const usage = response.data?.usageMetadata || {}

        return {
            ...cleanAndParseJson(text),
            usage: {
                promptTokens: usage.promptTokenCount || 0,
                completionTokens: usage.candidatesTokenCount || 0,
                totalTokens: usage.totalTokenCount || 0,
                modelId: modelId
            }
        }
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
    // return cleanAndParseJson(text); // [삭제됨] 위에서 통합 반환 처리
}

/**
 * Claude (Opus)를 사용하여 콘텐츠를 생성합니다.
 */
export async function generateClaudeContent(apiKey: string, systemPrompt: string, targetKeyword: string, model: string = "claude-sonnet-4-6", transcript?: string) {
    // 동적 import로 SDK 로드 (서버 사이드에서만 필요)
    const { Anthropic } = await import('@anthropic-ai/sdk');

    const anthropic = new Anthropic({
        apiKey: apiKey,
    });

    console.log(`[Claude] Starting generation for: "${targetKeyword}" with ${model}`);

    try {
        const msg = await anthropic.messages.create({
            model: model,
            max_tokens: 8192,
            system: `${systemPrompt}\n\n반드시 다음 JSON 형식으로만 응답하세요: {"title": "...", "content": "...", "imageKeywords": ["keyword1", ...], "thumbnailText": "..."}`,
            messages: [
                {
                    role: "user",
                    content: `${transcript ? `[참고 데이터 - 유튜브 스크립트]:\n${transcript}\n\n위 스크립트 내용을 바탕으로 블로그 글을 작성해줘. ` : ''}'${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘.
1. 본문은 5개 이상의 문단, 2000자 이상으로 풍부하게 작성.
2. <h1>, <html>, <head>, <body>, <style>, <script> 태그 사용 금지. 또한 인라인 스타일(style="...")도 금지. 오직 순수한 본문 태그(<h2>, <p>, <ul> 등)만 사용.
3. SEO에 최적화된 유용한 정보 위주로 작성.
4. **반드시 JSON 형식만 반환**하고, 마크다운 코드 블록(\`\`\`json)이나 사족을 달지 마시오.
5. 'imageKeywords' 필드에는 각 문단의 맥락과 어울리는 **상세한 영문 이미지 검색 키워드 5개**를 배열로 포함. (예: "modern laptop on white desk with plant"와 같이 구체적인 장면 묘사형 키워드 사용)
6. 'thumbnailText' 필드에는 썸네일용 10자 이내의 **클릭을 유도하는 짧은 문구** 포함. (**제목과 다른 내용을 사용**. 예: "이것만 알면 끝", "충격적인 결말")
**7. 중요: 제목('title')은 불필요한 접두어나 기호(<, >) 없이 독창적이고 깔끔한 문장으로만 작성하시오.**`
                }
            ]
        });

        const textBlock = msg.content[0];
        if (textBlock.type !== 'text') {
            throw new Error('Claude 응답이 텍스트 형식이 아닙니다.');
        }

        let text = textBlock.text;
        const usage = (msg as any).usage || { input_tokens: 0, output_tokens: 0 }

        return {
            ...cleanAndParseJson(text),
            usage: {
                promptTokens: usage.input_tokens || 0,
                completionTokens: usage.output_tokens || 0,
                totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
                modelId: model
            }
        };

    } catch (error: any) {
        console.error('Claude API Error:', error);
        throw new Error(`Claude 콘텐츠 생성 실패: ${error.message}`);
    }
}

/**
 * GPT-4o를 사용하여 콘텐츠를 생성합니다.
 */
export async function generateGPTContent(apiKey: string, systemPrompt: string, targetKeyword: string, model: string = "gpt-5-mini", transcript?: string) {
    const openai = new OpenAI({ apiKey })
    const isNewModel = model.includes('gpt-5') || model.startsWith('o1') || model.startsWith('o3');

    const params: any = {
        model: model,
        messages: [
            {
                role: "system", content: `당신은 블로그 글을 생성하는 AI입니다. 사용자의 요청에 따라 자유롭게 글을 작성하되, 시스템 연동을 위해 다음 **기술적 제약사항**만 반드시 지켜주세요.

[기술적 필수 제약사항]:
1. **형식**: 반드시 JSON 형식으로만 응답해야 합니다. (JSON 파싱 실패 시 시스템 오류 발생)
2. **태그 제한**: <h1>, <html>, <head>, <body>, <style>, <script> 태그 및 인라인 스타일은 절대 금지입니다. (<h2>, <h3>, <p>, <ul> 등 사용 권장)
3. **필수 필드**:
   - title: 글 제목 (원본을 그대로 사용하지 말고 반드시 새롭게 패러프레이징할 것. 접두어나 특수문자 없이 공백 포함 완성된 문장으로 작성)
   - content: 글 본문 (HTML 태그 포함)
   - imageKeywords: 이미지 검색용 상세 영문 키워드 5개 (배열). 단순 단어가 아닌 장면을 구체적으로 묘사하는 문구 형태(예: "cozy home office interior with warm lighting")로 작성할 것.
   - thumbnailText: 썸네일용 텍스트 (10자 이내)

그 외의 **글의 스타일, 어조, 길이, 구성** 등은 오직 아래 **사용자(User)의 요청**을 최우선으로 따르세요. 시스템이 강제하는 문체나 형식은 없습니다.`
            },
            {
                role: "user", content: `${transcript ? `[참고 데이터 - 유튜브 스크립트]:\n${transcript}\n\n위 스크립트 내용을 바탕으로 블로그 글을 작성해줘. ` : ''}'${targetKeyword}' 주제로 블로그 포스팅을 작성해줘.

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
        params.max_tokens = 16384;
        params.response_format = { type: "json_object" };
    }

    let completion: any;
    try {
        console.log(`Sending request to OpenAI with model: ${model}`);
        completion = await openai.chat.completions.create(params)
        console.log(`OpenAI Response for ${model}: `, JSON.stringify(completion, null, 2)); // FULL DEBUG LOG
    } catch (e: any) {
        // 429(Quota) 또는 401(Auth) 에러인 경우 폴백해도 실패하므로 즉시 중단
        const isAuthOrQuotaError = e.status === 429 || e.status === 401 || e.message?.toLowerCase().includes('quota') || e.message?.includes('429');

        // gpt-5 failed (e.g. 400 Bad Request if params invalid). Fallback to gpt-4o immediately if it was gpt-5
        if (isNewModel && !isAuthOrQuotaError) {
            console.warn(`GPT-5 generation failed with error: ${e.message}. Falling back to GPT-4o-mini.`);
            try {
                // Try GPT-4o-mini first as a fast fallback
                return await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o-mini');
            } catch (innerE: any) {
                console.warn(`GPT-4o-mini fallback failed: ${innerE.message}. Trying GPT-4o.`);
                return await generateGPTContent(apiKey, systemPrompt, targetKeyword, 'gpt-4o');
            }
        }
        // If it's not a new model (e.g. gpt-4o failing), or it's a quota error, return the error as content so user sees it
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

    const usage = completion.usage || { prompt_tokens: 0, completion_tokens: 0 }

    return {
        ...cleanAndParseJson(rawContent),
        usage: {
            promptTokens: usage.prompt_tokens || 0,
            completionTokens: usage.completion_tokens || 0,
            totalTokens: usage.total_tokens || 0,
            modelId: model
        }
    };
}

/**
 * 외부 이미지 URL을 다운로드합니다.
 */
export async function downloadImage(url: string, headers: any = {}, retries: number = 2): Promise<{ buffer: Buffer, contentType: string }> {
    const defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
    };

    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            // 특정 도메인에 대한 Referer 자동 설정
            const domainHeaders: any = {};
            const isPollinations = url.includes('pollinations.ai');

            if (url.includes('loremflickr.com')) {
                domainHeaders['Referer'] = 'https://loremflickr.com/';
            } else if (url.includes('unsplash.com')) {
                domainHeaders['Referer'] = 'https://unsplash.com/';
            } else if (url.includes('naver.com') || url.includes('pstatic.net')) {
                domainHeaders['Referer'] = 'https://blog.naver.com/';
            }

            // [수정] Pollinations AI는 특정 헤더(특히 Referer)가 있을 때 530 에러를 뱉는 경우가 있음
            const finalHeaders = isPollinations 
                ? { 'User-Agent': defaultHeaders['User-Agent'] } // 최소 헤더만 사용
                : { ...defaultHeaders, ...domainHeaders, ...headers };

            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: finalHeaders
            });
            return {
                buffer: Buffer.from(response.data),
                contentType: response.headers['content-type'] || 'image/png'
            };
        } catch (error: any) {
            lastError = error;
            console.warn(`Image download attempt ${i + 1} failed (${url}):`, error.message);
            if (i < retries - 1) {
                await new Promise(r => setTimeout(r, 1000 * (i + 1))); // 지수 백오프
            }
        }
    }

    console.error(`Final image download failure (${url}):`, lastError.message);
    throw new Error(`이미지 다운로드 실패: ${lastError.message}`);
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
    html = html.replace(/^\-\s+(.*$)/gim, '<li>$1</li>');

    // 4. 문단(단락)을 <p> 태그 혹은 블록 태그로 래핑하여 Blogger 에디터(Compose) 버그 방지
    // 두 번 이상의 줄바꿈(\n\n)을 기준으로 문단을 나눔
    const blocks = html.split(/\n\s*\n/);
    html = blocks.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';

        // Blogger 에디터는 최상단에 <p>, <div>, <h2> 등의 블록 태그가 명시되어 있지 않으면
        // '작성(Compose)' 모드에서 본문을 렌더링하지 못하는 버그가 있음 (빈 화면 노출)
        const isBlockTag = /^<(p|div|h[1-6]|ul|ol|li|blockquote|table|pre|hr|center|section|article|img|iframe|aside|header|footer)\b/i.test(trimmed);

        if (isBlockTag) {
            // 이미 블록 태그인 경우, 내부 줄바꿈만 <br />로 처리
            return trimmed.replace(/\n/g, '<br />').replace(/<\/li>\s*<br \/>\s*<li>/gi, '</li>\n<li>');
        }

        // 일반 텍스트이거나 인라인 태그로 시작하면 <p>로 감쌈
        return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n\n');

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
 * [고급 권한] 업로드된 이미지 배경 + 4줄 텍스트 썸네일 (600x600) 생성
 */
export async function generateAdvancedThumbnail(backgroundUrl: string, lines: string[]): Promise<Buffer> {
    const width = 600;
    const height = 600;

    // Font loading
    const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf');
    const fontData = readFileSync(fontPath);

    // Fetch background image
    let base64Bg = '';
    try {
        const bgResponse = await axios.get(backgroundUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const contentType = bgResponse.headers['content-type'] || 'image/png';
        const bgBuffer = Buffer.from(bgResponse.data);
        base64Bg = `data:${contentType};base64,${bgBuffer.toString('base64')}`;
    } catch (e) {
        console.error('Failed to fetch background image:', e);
        // Fallback or handle error (for now we proceed with empty string which will show nothing)
    }

    const element = createElement('div', {
        style: {
            display: 'flex', width: '100%', height: '100%',
            backgroundColor: '#000000', // Fallback color
            alignItems: 'center', justifyContent: 'center', position: 'relative',
            overflow: 'hidden'
        }
    }, [
        // Background Image (Bottom Layer)
        base64Bg && createElement('img', {
            src: base64Bg,
            style: {
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover'
            }
        }),
        // Dark Overlay (Middle Layer) - Using solid color + opacity for better Satori compatibility
        createElement('div', {
            style: {
                position: 'absolute', inset: 0,
                backgroundColor: '#000000', opacity: 0.8
            }
        }),
        // Text Container (Top Layer)
        createElement('div', {
            style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '40px', textAlign: 'center'
            }
        }, [
            // Line 1: Keyword (Yellow Box)
            createElement('div', {
                style: {
                    backgroundColor: '#fbbf24', color: '#000000', padding: '10px 28px',
                    fontSize: 56, fontWeight: 900, borderRadius: '8px', marginBottom: '20px'
                }
            }, lines[0]),
            // Line 2 & 3: White Text
            createElement('div', {
                style: { color: '#ffffff', fontSize: 60, fontWeight: 900, marginBottom: '10px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }
            }, lines[1]),
            createElement('div', {
                style: { color: '#ffffff', fontSize: 48, fontWeight: 900, marginBottom: '30px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }
            }, lines[2]),
            // Line 4: Contact (Red Box)
            createElement('div', {
                style: {
                    backgroundColor: '#ef4444', color: '#ffffff', padding: '10px 30px',
                    fontSize: 44, fontWeight: 900, borderRadius: '50px', letterSpacing: '1px'
                }
            }, lines[3])
        ])
    ]);

    const svg = await satori(element, {
        width, height,
        fonts: [{ name: 'NanumGothic', data: fontData, weight: 700, style: 'normal' }]
    });

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * [고급 권한] 본문 중간 이미지 (700x300) 생성
 * 문구A + 키워드 + 문구B
 */
export async function generateAdvancedContentImage(backgroundUrl: string, keyword: string, phraseA: string, phraseB: string): Promise<Buffer> {
    const width = 700;
    const height = 200;

    const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf');
    const fontData = readFileSync(fontPath);

    let base64Bg = '';
    try {
        const bgResponse = await axios.get(backgroundUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const contentType = bgResponse.headers['content-type'] || 'image/png';
        const bgBuffer = Buffer.from(bgResponse.data);
        base64Bg = `data:${contentType};base64,${bgBuffer.toString('base64')}`;
    } catch (e) {
        console.error('Failed to fetch content background image:', e);
    }

    const element = createElement('div', {
        style: {
            display: 'flex', width: '100%', height: '100%',
            backgroundColor: '#000000',
            alignItems: 'center', justifyContent: 'center', position: 'relative',
            overflow: 'hidden'
        }
    }, [
        base64Bg && createElement('img', {
            src: base64Bg,
            style: {
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                objectFit: 'cover'
            }
        }),
        createElement('div', {
            style: { position: 'absolute', inset: 0, backgroundColor: '#000000', opacity: 0.8 }
        }),
        createElement('div', {
            style: {
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '15px', textAlign: 'center', gap: '4px'
            }
        }, [
            createElement('div', { style: { color: '#ffffff', fontSize: 28, fontWeight: 900 } }, phraseA),
            createElement('div', {
                style: { color: '#fbbf24', fontSize: 42, fontWeight: 900, padding: '4px 16px', border: '3px solid #fbbf24', borderRadius: '4px' }
            }, keyword),
            createElement('div', { style: { color: '#ffffff', fontSize: 28, fontWeight: 900 } }, phraseB),
        ])
    ]);

    const svg = await satori(element, {
        width, height,
        fonts: [{ name: 'NanumGothic', data: fontData, weight: 700, style: 'normal' }]
    });

    return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * 워드프레스 미디어 라이브러리에 이미지를 업로드합니다.
 */
export async function uploadToWordPress(site: any, imageBuffer: Buffer, filename: string, contentType: string = 'image/png'): Promise<{ id: number, url: string }> {
    try {
        const response = await axios.post(`${site.url}/wp-json/wp/v2/media`, imageBuffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename=${encodeURIComponent(filename)}${filename.includes('.') ? '' : '.png'}`,
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

        // Raw SQL check for hasImageGenRights (Prisma Client might be stale)
        const rightsRes = await prisma.$queryRawUnsafe<any[]>(
            'SELECT "hasImageGenRights" FROM "users" WHERE id = $1',
            user.id
        )
        const hasRights = rightsRes?.[0]?.hasImageGenRights || false

        const settings = (user as any).settings || {}

        const keywords = ((job as any).keywords && (job as any).keywords.length > 0)
            ? (job as any).keywords
            : (job.keywordGroup?.keywords as string[] || [])

        if (!keywords || keywords.length === 0) return { success: false, error: '사용 가능한 키워드가 없습니다.' }

        // 고급 이미지용 배경 이미지 로테이션 준비
        let currentImageIdx = (job as any).advNextImageIdx || 0;
        const customImages = (job as any).advCustomImages || [];
        let imagesUsedCount = 0;

        const getNextBgUrl = (searchKeyword: string) => {
            if ((job as any).advImageMode === 'PREMIUM' && customImages.length > 0) {
                // 랜덤하게 이미지 선택
                const randomIdx = Math.floor(Math.random() * customImages.length);
                return customImages[randomIdx];
            }
            return null; // 일반 모드
        };

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

        const modelId = MODEL_ID_MAP[aiModel as AIModel] || 'gpt-4o'

        if (aiModel.toString().includes('GEMINI')) {
            if (!settings.geminiApiKey) throw new Error('Gemini API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateGeminiContent(settings.geminiApiKey, systemPrompt, targetKeyword, modelId, (job as any).transcript)
        } else if (aiModel.toString().includes('CLAUDE')) {
            if (!settings.anthropicApiKey) throw new Error('Claude API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateClaudeContent(settings.anthropicApiKey, systemPrompt, targetKeyword, modelId)
        } else {
            // Default: GPT models
            if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 설정되지 않았습니다. API 관리 메뉴에서 키를 입력해주세요.')
            aiResult = await generateGPTContent(settings.openaiApiKey, systemPrompt, targetKeyword, modelId)
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
                const isPremium = (job as any).advImageMode === 'PREMIUM';

                // 1번 이미지 (썸네일) 특별 처리
                if (i === 1 && job.site.type === 'WORDPRESS') {
                    const useTemplate = (job as any).useThumbnailTemplate !== false;
                    
                    if (useTemplate) {
                        try {
                            if (hasRights && (job as any).advThumbnailLines?.length === 4) {
                                // 고급 권한: 4줄 텍스트 + 배경 (커스텀 갤러리 또는 키워드 검색)
                                const searchKeyword = targetKeyword.split(' ')[0] || 'business';
                                let bgUrl = getNextBgUrl(searchKeyword);

                                if (!bgUrl) {
                                    // 일반 모드인 경우 기존처럼 랜덤 검색
                                    const searchedBg = await fetchRandomImage(settings, searchKeyword, 1);
                                    bgUrl = searchedBg || `https://picsum.photos/600/600?random=${Date.now()}`;
                                }

                                // 1번 라인은 항상 현재 키워드로 고정
                                const finalLines = [...(job as any).advThumbnailLines];
                                finalLines[0] = targetKeyword;

                                const thumbBuffer = await generateAdvancedThumbnail(bgUrl, finalLines);
                                const uploaded = await uploadToWordPress(job.site, thumbBuffer, `${targetKeyword}-adv-thumb-${Date.now()}`);
                                imageUrl = uploaded.url;
                                featuredMediaId = uploaded.id;
                            } else {
                                // 일반 권한: 기존 텍스트 썸네일
                                const safeThumbText = getSafeThumbnailText(aiResult.thumbnailText, title, targetKeyword);
                                const thumbBuffer = await generateThumbnail(safeThumbText);
                                const uploaded = await uploadToWordPress(job.site, thumbBuffer, `${targetKeyword}-thumb-${Date.now()}`);
                                imageUrl = uploaded.url;
                                featuredMediaId = uploaded.id;
                            }
                            success = true;
                        } catch (e) {
                            console.warn('WP/Thumbnail Template Error:', e);
                        }
                    }
                }

                // 2. 템플릿 안 쓰기로 했거나 본문 이미지일 때
                if (!imageUrl && !isPremium) {
                    try {
                        if (imageSource === 'DALLE') {
                            if (!settings.openaiApiKey) throw new Error('OpenAI API 키가 없습니다.');
                            const openai = new OpenAI({ apiKey: settings.openaiApiKey })
                            const imgPrompt = i === 1 ? `${targetKeyword} minimal vector art` : `${targetKeyword} detailed photo ${i}`;
                            const image = await openai.images.generate({ model: "dall-e-3", prompt: imgPrompt, size: "1024x1024" })
                            imageUrl = image.data?.[0]?.url || ''
                            if (imageUrl) success = true;
                        } else if (imageSource === 'SCRAP') {
                            const searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                                ? aiResult.imageKeywords[i - 1]
                                : (targetKeyword.split(' ')[0] || 'korea');

                            imageUrl = await fetchRandomImage(settings, searchKeyword, i);

                            // Fallback
                            if (!imageUrl) {
                                const w = i === 1 ? 768 : 768;
                                const h = i === 1 ? 512 : 512;
                                imageUrl = `https://picsum.photos/${w}/${h}?random=${Math.floor(Math.random() * 10000) + i}`
                            }
                            success = true;
                        } else if (imageSource === 'FLUX') {
                            if (!settings.piApiKey) throw new Error('PiAPI (FLUX) API 키가 없습니다.');
                            imageUrl = await generateFluxImage(settings.piApiKey, `${targetKeyword} blog image ${i}`)
                            if (imageUrl) success = true;
                        }
                    } catch (e) {
                        console.warn(`Image ${i} Generation/Scrape Failed`, e);
                    }
                }

                // 외부 이미지를 무조건 WP에 다운로드&업로드 처리
                if (imageUrl && job.site.type === 'WORDPRESS' && (!imageUrl.includes(job.site.url.replace(/^https?:\/\//, '')))) {
                    try {
                        const { buffer, contentType } = await downloadImage(imageUrl);
                        const uploaded = await uploadToWordPress(job.site, buffer, `${targetKeyword}-img-${i}-${Date.now()}`, contentType);
                        imageUrl = uploaded.url;
                        if (i === 1) {
                            featuredMediaId = uploaded.id;
                        }
                    } catch (e) {
                        console.warn(`Failed to process WP upload for external image ${i}:`, e);
                        imageUrl = ''; // 엑박 방지를 위해 초기화
                        success = false;
                    }
                }

                // 고급 권한: 본문 이미지 특수 처리 (나머지 이미지들, 위에서 가져온 imageUrl을 bgUrl로 활용)
                if (hasRights && i > 1 && (job as any).advContentPhraseA && (job as any).advContentPhraseB) {
                    try {
                        const searchKeyword = targetKeyword.split(' ')[0] || 'korea';
                        let bgUrl = imageUrl;

                        if ((job as any).advImageMode === 'PREMIUM' && customImages.length > 0) {
                            bgUrl = getNextBgUrl(searchKeyword);
                        }

                        if (bgUrl) {
                            const advancedImgBuffer = await generateAdvancedContentImage(bgUrl, targetKeyword, (job as any).advContentPhraseA, (job as any).advContentPhraseB);
                            if (job.site.type === 'WORDPRESS') {
                                const uploaded = await uploadToWordPress(job.site, advancedImgBuffer, `${targetKeyword}-adv-img-${i}-${Date.now()}`);
                                imageUrl = uploaded.url;
                            }
                            success = true;
                        }
                    } catch (e) {
                        console.warn(`Advanced Content Image ${i} generation failed:`, e);
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
        // Blogger의 경우 <html><body> 태그가 포함되면 에디터에서 빈 화면으로 보일 수 있음
        // 따라서 body 내부의 HTML만 추출하고, 전체를 <div>로 감싸서 전달하여 안정성 확보
        if (job.site.type === 'BLOGSPOT') {
            const bodyHtml = $('body').html();
            content = (bodyHtml || $.html()).trim();
            content = `<div class="blogger-post-wrapper">\n${content}\n</div>`;
        } else {
            content = $.html();
        }

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
            const targetStatus = (job as any).postStatus || 'publish';
            const requestUrl = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts`;
            const postToBlogger = async (token: string) => {
                return axios.post(requestUrl, {
                    kind: 'blogger#post',
                    title: title,
                    content: content
                }, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    params: { isDraft: targetStatus === 'draft' }
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
                postUrl,
                title,
                tokensUsed: tokensToDeduct,
                inputTokens: aiResult.usage?.promptTokens || 0,
                outputTokens: aiResult.usage?.completionTokens || 0,
                aiModelUsed: aiResult.usage?.modelId || modelId,
                status: 'SUCCESS'
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

        // 성공 시 다음 실행 시간 및 이미지 인덱스 업데이트
        await (prisma.automationJob as any).update({
            where: { id: jobId },
            data: {
                lastRunAt: new Date(),
                // nextRunAt는 cron 스케줄단(app/api/cron/route.ts)에서 이미 Lock을 걸면서 
                // 정확한 주기로 지정해두었으므로 여기서 덮어쓰지 않습니다 (종료 시간 기준 밀림 방지).
                advNextImageIdx: customImages.length > 0 ? (currentImageIdx + imagesUsedCount) % customImages.length : 0
            }
        });

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
