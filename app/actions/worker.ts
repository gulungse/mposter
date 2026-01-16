'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { GoogleGenerativeAI } from "@google/generative-ai"
import OpenAI from 'openai'
import axios from 'axios'
import { revalidatePath } from 'next/cache'

/**
 * 블로거(Blogger)의 만료된 Access Token을 Refresh Token으로 갱신합니다.
 */
async function refreshBloggerToken(site: any, clientId?: string, clientSecret?: string) {
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
async function getAvailableGeminiModels(apiKey: string) {
    try {
        const refererUrl = process.env.NEXT_PUBLIC_SITE_URL
            ? (process.env.NEXT_PUBLIC_SITE_URL.endsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : `${process.env.NEXT_PUBLIC_SITE_URL}/`)
            : 'http://localhost:3000/';

        // v1beta 엔드포인트에서 모델 목록 조회
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
            headers: { 'Referer': refererUrl },
            timeout: 10000
        });

        return response.data?.models || [];
    } catch (error: any) {
        console.warn('Gemini Model List Failed:', error.message);
        return [];
    }
}

async function generateGeminiContent(apiKey: string, systemPrompt: string, targetKeyword: string) {
    const trimmedKey = apiKey.trim()

    // 1. 사용 가능한 모델 목록 조회 (스마트 감지)
    const availableModels = await getAvailableGeminiModels(trimmedKey);
    const availableNames = availableModels.map((m: any) => m.name); // 예: ['models/gemini-1.5-flash', ...]
    console.log('Available Gemini Models:', availableNames);

    // 2. 우선순위에 따라 최적의 모델 선택
    // 사용자 추천: gemini-1.5-pro > gemini-1.5-flash
    let selectedModelName = availableNames.find((name: string) => name.includes('gemini-1.5-pro'))
        || availableNames.find((name: string) => name.includes('gemini-1.5-flash'))
        || availableNames.find((name: string) => name.includes('gemini-pro') && !name.includes('vision'));

    // 목록 조회가 실패했거나 매칭되는 게 없으면 강제로 최신 지정
    let modelId = selectedModelName ? selectedModelName.replace('models/', '') : 'gemini-1.5-pro';

    // 1.5 계열은 v1beta, 그 외는 상황 봐서 처리하지만 여기선 감지된 모델 위주
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
반드시 JSON 형식 {"title": "...", "content": "..."}으로만 답변하고, JSON 외의 텍스트는 절대 포함하지 마.`
                }]
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Referer': refererUrl
            },
            timeout: 60000 // 생성 시간 고려하여 타임아웃 증대
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

    // JSON 응답 정제
    const cleanedText = text.replace(/```json|```/g, '').trim()
    try {
        return JSON.parse(cleanedText || '{}')
    } catch (e) {
        // 완전한 JSON이 아닐 경우 최소한의 구조 생성
        return { title: targetKeyword, content: text }
    }
}

/**
 * piAPI (FLUX)를 사용하여 이미지를 생성하고 결과를 가져옵니다.
 */
async function generateFluxImage(apiKey: string, prompt: string) {
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
 * 특정 데이터를 가지고 실제 사이트에 테스트 발행을 수행합니다.
 */
export async function testPublishAction(data: {
    siteId: string;
    keywordGroupId?: string;
    keywords?: string[];
    promptId: string;
    aiModel: 'GPT4O' | 'GEMINI';
    imageSource: 'SCRAP' | 'DALLE' | 'FLUX' | 'NONE';
    wpCategoryId?: number;
}) {
    try {
        const user = await getOrCreateUser()
        if (user.tokenBalance <= 0) {
            throw new Error('보유 토큰이 부족합니다. 테스트 발행을 위해서는 최소 1토큰이 필요합니다.')
        }

        const settings = (user as any).settings || {}

        const [site, keywordGroup, prompt] = await Promise.all([
            prisma.site.findUnique({ where: { id: data.siteId, userId: user.id } }),
            data.keywordGroupId ? prisma.keywordGroup.findUnique({ where: { id: data.keywordGroupId, userId: user.id } }) : Promise.resolve(null),
            prisma.prompt.findFirst({
                where: {
                    id: data.promptId,
                    OR: [
                        { userId: user.id },
                        { type: 'SYSTEM' }
                    ]
                }
            })
        ])

        if (!site || (!keywordGroup && !data.keywords?.length) || !prompt) throw new Error('대상 사이트, 키워드, 또는 프롬프트 데이터를 찾을 수 없습니다.')

        const keywords = (data.keywords && data.keywords.length > 0) ? data.keywords : (keywordGroup?.keywords as string[] || [])
        if (keywords.length === 0) throw new Error('사용 가능한 키워드가 없습니다.')

        const targetKeyword = keywords[Math.floor(Math.random() * keywords.length)]

        let title = ''
        let content = ''
        const systemPrompt = prompt.content

        try {
            if (data.aiModel === 'GPT4O') {
                const apiKey = settings.openaiApiKey
                if (!apiKey) throw new Error('OpenAI API 키가 설정되어 있지 않습니다.')
                const openai = new OpenAI({ apiKey })
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: `${systemPrompt}\n당신은 SEO에 최적화된 전문 블로거입니다. 독자가 궁금해하는 정보를 상세하고 친절하게 설명해야 합니다.` },
                        {
                            role: "user", content: `'${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘. 
    본문은 반드시 5개 이상의 긴 문단으로 구성하고, 각 문단에는 구체적인 정보와 유용한 팁을 포함해줘. 전체 분량은 최소 1200자 이상으로 매우 풍부하게 작성해야 해.
    반드시 JSON 형식 {"title": "...", "content": "..."}으로 답변해줘.` }
                    ],
                    response_format: { type: "json_object" }
                })
                const aiResult = JSON.parse(completion.choices[0].message.content || '{}')
                title = aiResult.title || aiResult.subject || aiResult.header || '테스트 제목'
                content = aiResult.content || aiResult.body || aiResult.text || aiResult.article || '테스트 본문'

                if (content === '테스트 본문' && completion.choices[0].message.content) {
                    content = completion.choices[0].message.content;
                }
            } else {
                const apiKey = settings.geminiApiKey
                if (!apiKey) throw new Error('Gemini API 키가 설정되어 있지 않습니다.')
                const aiResult = await generateGeminiContent(apiKey, systemPrompt, targetKeyword)
                title = aiResult.title || '테스트 제목'
                content = aiResult.content || '테스트 본문'
            }
        } catch (err: any) {
            console.error('AI Generation Failed:', err)
            throw new Error(`[AI 생성 실패] ${err.response?.status === 401 ? 'API 키가 유효하지 않습니다.' : err.message}`)
        }

        let imageUrl = ''
        try {
            if (data.imageSource === 'DALLE') {
                const apiKey = settings.openaiApiKey
                if (apiKey) {
                    const openai = new OpenAI({ apiKey })
                    const image = await openai.images.generate({ model: "dall-e-3", prompt: `${targetKeyword} 일러스트`, n: 1, size: "1024x1024" })
                    imageUrl = image.data?.[0]?.url || ''
                }
            } else if (data.imageSource === 'SCRAP') {
                imageUrl = `https://loremflickr.com/1200/800/${encodeURIComponent(targetKeyword)}?lock=${Math.floor(Math.random() * 1000)}`
            } else if (data.imageSource === 'FLUX') {
                const apiKey = settings.piApiKey
                if (apiKey) {
                    imageUrl = await generateFluxImage(apiKey, `${targetKeyword} high quality blog hero image, professional photography`)
                }
            }
        } catch (err: any) {
            console.warn('Image Generation Failed (Proceeding without image):', err.message)
        }

        if (imageUrl) {
            content = `<img src="${imageUrl}" style="width:100%; border-radius:8px; margin-bottom:20px;"/>\n${content}`
        }

        // 실제 사이트 발행
        try {
            if (site.type === 'WORDPRESS') {
                await axios.post(`${site.url}/wp-json/wp/v2/posts`, {
                    title: `[테스트] ${title}`,
                    content: content,
                    status: 'publish',
                    categories: data.wpCategoryId ? [data.wpCategoryId] : []
                }, {
                    auth: { username: site.username || '', password: site.apiToken || '' },
                    timeout: 30000
                })
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
            throw new Error(`[발행 실패] ${err.message}`)
        }

        // 성공 시 토큰 차감
        await (prisma as any).$executeRawUnsafe(
            'UPDATE "users" SET "tokenBalance" = "tokenBalance" - 1 WHERE "id" = $1',
            user.id
        )

        revalidatePath('/dashboard')
        return { success: true, message: '테스트 발행 성공! (1토큰 사용됨)' }
    } catch (error: any) {
        console.error('Final Catch in testPublishAction:', error)
        return { success: false, error: error.message }
    }
}

/**
 * 자동화 작업 실행 전담 로직
 */
export async function runAutomationTask(jobId: string) {
    try {
        const user = await getOrCreateUser()
        const settings = (user as any).settings || {}

        const job = await prisma.automationJob.findUnique({
            where: { id: jobId, userId: user.id },
            include: { site: true, keywordGroup: true, prompt: true }
        })

        if (!job) return { success: false, error: '작업 데이터를 찾을 수 없습니다.' }

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
        const aiModel = (job as any).aiModel || 'GPT4O'
        const systemPrompt = job.prompt?.content || 'SEO 블로거로서 글을 작성해줘.'

        if (aiModel === 'GPT4O') {
            const apiKey = settings.openaiApiKey
            const openai = new OpenAI({ apiKey })
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: `${systemPrompt}\n당신은 SEO에 최적화된 전문 블로거입니다. 독자가 궁금해하는 정보를 상세하고 친절하게 설명해야 합니다.` },
                    {
                        role: "user", content: `'${targetKeyword}' 키워드로 블로그 제목과 본문을 작성해줘. 
본문은 반드시 5개 이상의 긴 문단으로 구성하고, 각 문단에는 구체적인 정보와 유용한 팁을 포함해줘. 전체 분량은 최소 1200자 이상으로 매우 풍부하게 작성해야 해.
반드시 JSON 형식 {"title": "...", "content": "..."}으로 답변해줘.` }
                ],
                response_format: { type: "json_object" }
            })
            const aiResult = JSON.parse(completion.choices[0].message.content || '{}')
            title = aiResult.title || aiResult.subject || targetKeyword
            content = aiResult.content || aiResult.body || aiResult.text || targetKeyword

            if (content === targetKeyword && completion.choices[0].message.content) {
                content = completion.choices[0].message.content;
            }
        } else {
            const apiKey = settings.geminiApiKey
            const aiResult = await generateGeminiContent(apiKey, systemPrompt, targetKeyword)
            title = aiResult.title || targetKeyword
            content = aiResult.content || targetKeyword
        }

        const imageSource = (job as any).imageSource || 'NONE'
        let imageUrl = ''
        if (imageSource === 'DALLE') {
            const openai = new OpenAI({ apiKey: settings.openaiApiKey })
            const image = await openai.images.generate({ model: "dall-e-3", prompt: `${targetKeyword} 이미지`, size: "1024x1024" })
            imageUrl = image.data?.[0]?.url || ''
        } else if (imageSource === 'SCRAP') {
            // 키워드 기반 랜덤 이미지 검색
            imageUrl = `https://loremflickr.com/1200/800/${encodeURIComponent(targetKeyword)}?lock=${Math.floor(Math.random() * 1000)}`
        } else if (imageSource === 'FLUX') {
            const apiKey = settings.piApiKey
            if (apiKey) {
                imageUrl = await generateFluxImage(apiKey, `${targetKeyword} high quality blog hero image, professional photography`)
            }
        }

        if (imageUrl) {
            content = `<img src="${imageUrl}" style="width:100%; margin-bottom:20px;"/>\n${content}`
        }

        let postUrl = ''
        if (job.site.type === 'WORDPRESS') {
            const res = await axios.post(`${job.site.url}/wp-json/wp/v2/posts`, {
                title, content, status: 'publish', categories: (job as any).wpCategoryId ? [(job as any).wpCategoryId] : []
            }, {
                auth: { username: job.site.username || '', password: job.site.apiToken || '' }
            })
            postUrl = res.data.link
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


        // 토큰 비용 계산 (시스템 설정 적용)
        let globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } })
        // 설정이 없으면 기본값 사용
        const costs = globalSettings || { costPerPost: 1, costPerScrap: 1, costPerAIImage: 2 }

        let tokensToDeduct = costs.costPerPost
        // imageSource is already defined earlier in the function
        if (imageSource === 'DALLE' || imageSource === 'FLUX') {
            tokensToDeduct += costs.costPerAIImage
        } else if (imageSource === 'SCRAP') {
            tokensToDeduct += costs.costPerScrap
        }

        // 실행 전 토큰 잔액 체크 (안전장치)
        const currentUser = await prisma.user.findUnique({ where: { id: user.id } })
        if (!currentUser || currentUser.tokenBalance < tokensToDeduct) {
            throw new Error(`토큰 잔액이 부족합니다. (필요: ${tokensToDeduct}, 보유: ${currentUser?.tokenBalance || 0})`)
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
                description: `자동화 작업 실행 (${job.name}) - 이미지: ${imageSource}`,
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
