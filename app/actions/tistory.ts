'use server'

import axios from 'axios'
import * as cheerio from 'cheerio'

/**
 * 티스토리 URL에서 제목과 본문을 추출합니다.
 */
export async function scrapeTistory(url: string) {
    try {
        // 1. URL 정제 및 모바일 URL 생성
        let targetUrl = url.trim();
        if (targetUrl.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
        
        // 포스트 번호 추출 (예: https://thanksy6905.tistory.com/5 -> 5)
        const postNumberMatch = targetUrl.match(/\/(\d+)$/);
        const postNumber = postNumberMatch ? postNumberMatch[1] : null;
        
        let title = '';
        let content = '';

        // 2. 모바일 뷰 시도 (표준화된 구조)
        if (postNumber) {
            const baseUrl = targetUrl.replace(/\/(\d+)$/, '');
            const mobileUrl = `${baseUrl}/m/${postNumber}`;
            
            try {
                const response = await axios.get(mobileUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
                    },
                    timeout: 10000
                });
                
                const $ = cheerio.load(response.data);
                title = $('.view_tit').text().trim() || $('h2.tit_view').text().trim();
                
                // 모바일 본문 영역
                const contentEl = $('.view_content');
                if (contentEl.length > 0) {
                    // 불필요한 태그 제거 (광고, 관련글 등)
                    contentEl.find('.revenue_unit_wrap, .another_category, .container_postbtn').remove();
                    content = contentEl.html() || '';
                }
            } catch (err) {
                console.warn('Tistory mobile scrape failed, falling back to desktop:', err);
            }
        }

        // 3. 데스크톱 뷰 시도 (모바일 실패 시 또는 포스트번호가 없는 경우)
        if (!content) {
            const response = await axios.get(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(response.data);
            
            // 1. Prioritize known post title selectors
            const postTitleSelectors = [
                '.tit_post', '.view_tit', 'h2.tit_view', 
                '.entry-title', '.title_post', 'h1.title', 
                '.post-header h1', '.article-title', '.title_view'
            ];
            
            for (const selector of postTitleSelectors) {
                const found = $(selector).first().text().trim();
                if (found && found !== '그대' && found.length > 1) {
                    title = found;
                    break;
                }
            }
            
            // 2. Fallback to H1 but filter out likely logos/blog titles
            if (!title) {
                $('h1').each((_, el) => {
                    const h1Text = $(el).text().trim();
                    const h1Class = $(el).attr('class') || '';
                    const h1Id = $(el).attr('id') || '';
                    const parentClass = $(el).parent().attr('class') || '';
                    const parentId = $(el).parent().attr('id') || '';
                    
                    // Skip if it looks like a logo, blog title, or header
                    const isLogo = /logo|header|blog_title|tit_blog/i.test(h1Class + h1Id + parentClass + parentId);
                    const isCommonGeneric = h1Text === '그대' || h1Text === 'Tistory' || h1Text.length < 2;
                    
                    if (!isLogo && !isCommonGeneric) {
                        title = h1Text;
                        return false; // Break loop
                    }
                });
            }
            
            // 3. Last resort: pick the first non-empty title-like class if still empty
            title = title || $('.title').first().text().trim();
            
            // 데스크톱 공통 선택자 순차 검색
            const selectors = ['.tt_article_content', '.entry-content', '.article_view', '#article-view', '.post-content'];
            for (const selector of selectors) {
                const el = $(selector);
                if (el.length > 0) {
                    el.find('.revenue_unit_wrap, .another_category, .container_postbtn').remove();
                    content = el.html() || '';
                    break;
                }
            }
        }

        if (!content) {
            throw new Error('본문을 찾을 수 없습니다. URL을 확인하거나 수동으로 복사해주세요.');
        }

        // 본문 내 텍스트 정제 (HTML 태그는 남기고 사족 제거)
        // cheerio로 이미 html()을 가져왔으므로 기본적인 정제는 완료됨

        return {
            success: true,
            data: {
                title: title.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
                content: content.trim()
            }
        };

    } catch (error: any) {
        console.error('Tistory Scraping Error:', error);
        return { success: false, error: error.message || '스크래핑 중 오류가 발생했습니다.' };
    }
}
