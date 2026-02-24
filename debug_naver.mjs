import axios from 'axios';
import * as cheerio from 'cheerio';

async function debugScrape(url) {
    console.log('Debugging URL:', url);
    try {
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

        console.log('HTML Length:', html.length);
        console.log('Title Tag:', $('title').text());
        console.log('OG Title:', $('meta[property="og:title"]').attr('content'));

        const seMainCount = $('.se-main-container').length;
        console.log('SE Main Container Count:', seMainCount);

        if (seMainCount > 0) {
            console.log('SE Text Blocks Count:', $('.se-main-container .se-text').length);
            console.log('SE P Tags Count:', $('.se-main-container .se-text p').length);
        }

        // Check if there are script tags containing the actual content (some Naver posts might do this)
        const scripts = $('script').length;
        console.log('Total Scripts:', scripts);

        // Try extracting with existing logic
        let title = $('.se-title-text').text().trim()
            || $('.se_title .se_textarea').text().trim()
            || $('meta[property="og:title"]').attr('content')
            || $('title').text().replace(' : 네이버 블로그', '').trim();

        let content = '';
        if ($('.se-main-container').length > 0) {
            $('.se-main-container .se-component').each((_, el) => {
                const $comp = $(el);
                if ($comp.hasClass('se-image')) {
                    // Try to find the highest resolution image URL
                    const imgUrl = $comp.find('img').attr('data-lazy-src')
                        || $comp.find('img').attr('src')
                        || $comp.find('img').attr('data-src');
                    if (imgUrl) {
                        // Clean URL (sometimes they have extra params)
                        const cleanUrl = imgUrl.split('?')[0];
                        content += `<img src="${cleanUrl}" style="max-width: 100%; height: auto; display: block; margin: 20px auto; border-radius: 8px;" />\n\n`;
                    }
                } else if ($comp.hasClass('se-text')) {
                    $comp.find('p').each((_, p) => {
                        const text = $(p).text().trim();
                        if (text) content += text + '\n\n';
                    });
                }
            });

            if (!content) {
                content = $('.se-main-container').text().trim();
            }
        } else if ($('#post-view').length > 0) {
            content = $('#post-view').text().trim();
        }

        console.log('Extracted Title:', title);
        console.log('Extracted Content (first 100 chars):', content.substring(0, 100));

    } catch (error) {
        console.error('Debug Scrape Failed:', error.message);
    }
}

const url = 'https://m.blog.naver.com/kevin1406/222674169456';
debugScrape(url);
