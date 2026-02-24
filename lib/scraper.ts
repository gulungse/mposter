import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * 네이버 블로그 URL에서 제목과 내용을 추출합니다.
 */
export async function scrapeNaverBlog(url: string) {
    try {
        // 모바일 URL로 변환하면 추출이 더 용이한 경우가 많음
        let mobileUrl = url;
        if (url.includes('blog.naver.com') && !url.includes('m.blog.naver.com')) {
            mobileUrl = url.replace('blog.naver.com', 'm.blog.naver.com');
        }

        const response = await axios.get(mobileUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // 1. 제목 추출
        // Smart Editor One 은 .se-title-text, 구버전은 .htitle 등
        let title = $('.se-title-text').text().trim()
            || $('.se_title .se_textarea').text().trim()
            || $('meta[property="og:title"]').attr('content')
            || $('title').text().replace(' : 네이버 블로그', '').trim();

        // 2. 본문 및 이미지 추출 (Smart Editor One 위주)
        let content = '';

        if ($('.se-main-container').length > 0) {
            $('.se-main-container .se-component').each((_, el) => {
                const $comp = $(el);

                // 이미지 처리
                if ($comp.hasClass('se-image') || $comp.find('img').length > 0) {
                    const $img = $comp.find('img');
                    let imgUrl = $img.attr('data-lazy-src')
                        || $img.attr('src')
                        || $img.attr('data-src')
                        || $img.attr('data-lazy-srcset')?.split(' ')[0];

                    if (imgUrl) {
                        // 네이버 원본 이미지 주소로 변환
                        // https://postfiles.pstatic.net/... -> https://blogfiles.pstatic.net/...
                        if (imgUrl.includes('pstatic.net')) {
                            // 쿼리 스트링 제거
                            imgUrl = imgUrl.split('?')[0];
                            // 도메인을 blogfiles로 통일 (가장 원본이 잘 나옴)
                            const domainsToReplace = [
                                'postfiles.pstatic.net',
                                'mblogthumb-phinf.pstatic.net',
                                'phinf.pstatic.net'
                            ];
                            for (const domain of domainsToReplace) {
                                if (imgUrl.includes(domain)) {
                                    imgUrl = imgUrl.replace(domain, 'blogfiles.pstatic.net');
                                    break;
                                }
                            }
                        }

                        content += `<img src="${imgUrl}" style="max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px;" />\n\n`;
                    }
                }
                // 텍스트 처리
                else if ($comp.hasClass('se-text')) {
                    $comp.find('p').each((_, pEl) => {
                        const text = $(pEl).text().trim();
                        if (text) content += text + '\n\n';
                    });
                }
            });

            // 만약 추출된 내용이 전혀 없다면 fallback
            if (!content) {
                content = $('.se-main-container').text().trim();
            }
        }
        // 구버전 또는 다른 포맷 대응
        else if ($('#post-view').length > 0) {
            content = $('#post-view').text().trim();
        }
        else if ($('.se_component_wrap').length > 0) {
            content = $('.se_component_wrap').text().trim();
        }

        if (!content) {
            throw new Error('블로그 본문을 찾을 수 없습니다.');
        }

        return {
            title,
            content: content.trim()
        };
    } catch (error: any) {
        console.error('Naver Blog Scraping Error:', error.message);
        throw new Error(`블로그 추출 실패: ${error.message}`);
    }
}
