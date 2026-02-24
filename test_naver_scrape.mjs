import axios from 'axios';
import * as cheerio from 'cheerio';

async function testNaverScrape() {
    const url = 'https://m.blog.naver.com/kevin1406/222674169456';
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        // Naver Blog Smart Editor One content is usually in .se-main-container or similar
        const title = $('title').text();
        const content = $('.se-main-container').text().trim() || 'Content not found in .se-main-container';

        console.log('Title:', title);
        console.log('Content Preview:', content.substring(0, 500));
        console.log('HTML length:', html.length);

        // If content is empty, maybe it's in a script tag or different class
        if (content.includes('Content not found')) {
            console.log('Checking alternative selectors...');
            const altContent = $('#post-view').text().trim();
            console.log('Alt Content Preview:', altContent.substring(0, 500));
        }

    } catch (error) {
        console.error('Scrape failed:', error.message);
    }
}

testNaverScrape();
