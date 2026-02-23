'use server'

import { prisma } from '@/lib/prisma'
import { getOrCreateUser } from '@/lib/auth'
import { 
    generateGPTContent, 
    generateGeminiContent, 
    generateClaudeContent, 
    uploadToWordPress, 
    generateThumbnail, 
    getSafeThumbnailText,
    generateAdvancedThumbnail,
    cleanTitle,
    downloadImage
} from '@/lib/automation'
import { fetchRandomImage } from '@/lib/image_providers'
import { scrapeTistory } from './tistory'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { revalidatePath } from 'next/cache'

/**
 * 티스토리 글을 가져와 재작성 후 워드프레스에 발행합니다.
 */
export async function tistoryRewritePublishAction(data: {
    tistoryUrl: string;
    siteId: string;
    wpCategoryId: number;
    imageSource: 'SCRAP' | 'DALLE' | 'FLUX' | 'NONE';
    imageCount: number;
    promptId?: string;
    customPrompt?: string;
    aiModel: 'GPT4O' | 'GEMINI' | 'CLAUDE' | 'GPT5';
    // 고급 이미지 설정 (필요시)
    advThumbnailLines?: string[];
    advImageMode?: string;
    advCustomImages?: string[];
}) {
    try {
        const user = await getOrCreateUser()
        
        // 권한 체크 (가져오기 권한 또는 관리자)
        const rightsRes = await (prisma as any).$queryRawUnsafe(`SELECT "hasImageGenRights" FROM "users" WHERE id = '${user.id}'`)
        const hasRights = rightsRes?.[0]?.hasImageGenRights || false
        const isAdmin = user.role === 'ADMIN'

        if (!hasRights && !isAdmin) {
            throw new Error('접근 권한이 없습니다. 관리자에게 문의하세요.')
        }

        // 토큰 체크
        const globalSettings = await prisma.globalSetting.findUnique({ where: { id: 'SYSTEM' } })
        const costs = globalSettings || { costPerPost: 1, costPerScrap: 1, costPerAIImage: 2 }
        
        if (user.tokenBalance < costs.costPerPost) {
            throw new Error(`보유 토큰이 부족합니다. (현재: ${user.tokenBalance})`)
        }

        const settings = (user as any).settings || {}

        // 1. 티스토리 스크래핑
        const scrapeRes = await scrapeTistory(data.tistoryUrl)
        if (!scrapeRes.success || !scrapeRes.data) {
            throw new Error(scrapeRes.error || '티스토리 글을 불러오지 못했습니다.')
        }

        const { title: originalTitle, content: originalContent } = scrapeRes.data

        // 2. 프롬프트 준비
        let systemPrompt = data.customPrompt || ''
        if (data.promptId) {
            const p = await prisma.prompt.findUnique({ where: { id: data.promptId } })
            if (p) systemPrompt = p.content
        }

        if (!systemPrompt) throw new Error('적용할 프롬프트가 없습니다.')

        // 3. AI 재작성
        const inputContext = `[원본 제목]: ${originalTitle}\n\n[원본 본문]:\n${originalContent}`
        let aiResult: any = {}

        if (data.aiModel === 'GPT4O') {
            aiResult = await generateGPTContent(settings.openaiApiKey, systemPrompt, originalTitle, 'gpt-4o', inputContext)
        } else if (data.aiModel === 'GEMINI') {
            aiResult = await generateGeminiContent(settings.geminiApiKey, systemPrompt, originalTitle, inputContext)
        } else if (data.aiModel === 'CLAUDE') {
            aiResult = await generateClaudeContent(settings.anthropicApiKey, systemPrompt, originalTitle, inputContext)
        } else if (data.aiModel === 'GPT5') {
            aiResult = await generateGPTContent(settings.openaiApiKey, systemPrompt, originalTitle, 'gpt-5-mini', inputContext)
        }

        const title = cleanTitle(aiResult.title || originalTitle)
        let content = aiResult.content || ''

        // 4. 이미지 처리 및 본문 삽입
        const site = await prisma.site.findUnique({ where: { id: data.siteId, userId: user.id } })
        if (!site) throw new Error('대상 사이트를 찾을 수 없습니다.')

        let featuredMediaId = 0
        let imagesGeneratedCount = 0

        const $ = cheerio.load(content)
        const headings = $('h2, h3')

        if (headings.length > 0 && data.imageSource !== 'NONE') {
            const insertionRules = [
                { imgIdx: 1, headIdx: 0, pos: 'before' },
                { imgIdx: 2, headIdx: 2, pos: 'after' },
                { imgIdx: 3, headIdx: 3, pos: 'after' }
            ]

            for (let i = 1; i <= data.imageCount; i++) {
                const rule = insertionRules.find(r => r.imgIdx === i)
                if (!rule || headings.length <= rule.headIdx) continue

                const targetHeading = $(headings[rule.headIdx])
                let imageUrl = ''

                // 모든 이미지는 동일한 로직으로 가져오되, i=1인 경우 featuredMediaId로 저장
                
                // 1. AI 이미지 생성 (DALLE, FLUX)
                if (data.imageSource === 'DALLE' || data.imageSource === 'FLUX') {
                    try {
                        let prompt = aiResult.imageKeywords?.[i - 1] || `${originalTitle} ${i}`
                        if (data.imageSource === 'DALLE') {
                            const OpenAI = (await import('openai')).default
                            const openai = new OpenAI({ apiKey: settings.openaiApiKey })
                            const res = await openai.images.generate({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024' })
                            imageUrl = res.data?.[0]?.url || ''
                        } else {
                            imageUrl = await (await import('@/lib/automation')).generateFluxImage(settings.piApiKey, prompt)
                        }
                    } catch (e) {
                        console.warn(`AI Image ${i} generation failed:`, e)
                    }
                }

                // 2. SCRAP (무료 고화질 검색)
                if (!imageUrl && data.imageSource === 'SCRAP') {
                    const searchKeyword = (aiResult.imageKeywords && aiResult.imageKeywords[i - 1])
                        ? aiResult.imageKeywords[i - 1]
                        : (originalTitle.split(' ')[0] || 'korea')
                    
                    let targetUrl = await fetchRandomImage(settings, searchKeyword, i)
                    if (!targetUrl) {
                        // LoremFlickr 403 대비 PicsumFallback 사용 또는 랜덤 이미지 서비스 교체
                        targetUrl = `https://picsum.photos/seed/${Date.now()}${i}/800/500`
                    }
                    
                    try {
                        const imgBuffer = await downloadImage(targetUrl);
                        const uploaded = await uploadToWordPress(site, imgBuffer, `post-img-${Date.now()}-${i}`);
                        imageUrl = uploaded.url;
                        if (i === 1) featuredMediaId = uploaded.id;
                    } catch (e) {
                        console.warn('SCRAP Image download/upload failed:', e);
                        imageUrl = targetUrl; // Fallback to hotlink
                    }
                }

                // 3. AI 이미지 업로드 (i=1 featured media 설정을 위해)
                if (imageUrl && i === 1 && (data.imageSource === 'DALLE' || data.imageSource === 'FLUX')) {
                    try {
                        const imgBuffer = await downloadImage(imageUrl);
                        const uploaded = await uploadToWordPress(site, imgBuffer, `featured-${Date.now()}`);
                        imageUrl = uploaded.url;
                        featuredMediaId = uploaded.id;
                    } catch (e) {
                        console.warn('AI Featured image upload failed:', e);
                    }
                }

                if (imageUrl) {
                    imagesGeneratedCount++
                    const style = "width:100%; max-width:700px; height:auto; display:block; margin: 20px auto; border-radius:8px;"
                    const imgTag = `<img src="${imageUrl}" alt="${title}" style="${style}" />`
                    if (rule.pos === 'before') targetHeading.before(imgTag)
                    else targetHeading.after(imgTag)
                }
            }
        }
        content = $.html()

        // 5. 워드프레스 발행
        let finalPostUrl = ''
        if (site.type === 'WORDPRESS') {
            const payload: any = {
                title, content, status: 'publish',
                categories: data.wpCategoryId ? [data.wpCategoryId] : []
            }
            if (featuredMediaId > 0) payload.featured_media = featuredMediaId

            const wpRes = await axios.post(`${site.url}/wp-json/wp/v2/posts`, payload, {
                auth: { username: site.username || '', password: site.apiToken || '' },
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 60000
            })
            finalPostUrl = wpRes.data.link
        }

        // 6. 토큰 차감 및 로그 기록
        let tokensToDeduct = costs.costPerPost
        if (data.imageSource === 'SCRAP') tokensToDeduct += (costs.costPerScrap * imagesGeneratedCount)
        else if (data.imageSource !== 'NONE') tokensToDeduct += (costs.costPerAIImage * imagesGeneratedCount)

        const finalDeduct = Math.max(tokensToDeduct, costs.costPerPost)

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { tokenBalance: { decrement: finalDeduct } }
            }),
            prisma.transaction.create({
                data: {
                    userId: user.id,
                    amount: -finalDeduct,
                    description: `티스재작성 발행: ${title}`,
                    type: 'USAGE'
                }
            }),
            prisma.postLog.create({
                data: {
                    userId: user.id,
                    keyword: originalTitle,
                    title: title,
                    status: 'SUCCESS',
                    postUrl: finalPostUrl,
                    tokensUsed: finalDeduct
                }
            })
        ])

        revalidatePath('/dashboard')
        revalidatePath('/dashboard/logs')

        return { success: true, postUrl: finalPostUrl }

    } catch (error: any) {
        console.error('Tistory Rewrite Publish Error:', error)
        return { success: false, error: error.message || '발행 중 오류가 발생했습니다.' }
    }
}
