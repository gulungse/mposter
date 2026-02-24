import { scrapeNaverBlog } from './lib/scraper.js';

async function verify() {
    const url = 'https://m.blog.naver.com/kevin1406/222674169456';
    console.log('Verifying Naver Blog extraction for:', url);

    try {
        const result = await scrapeNaverBlog(url);
        console.log('SUCCESS!');
        console.log('Title:', result.title);
        console.log('Content Length:', result.content.length);
        console.log('Content Preview:', result.content.substring(0, 200) + '...');

        if (result.title.includes('L-SAM') && result.content.includes('L-SAM')) {
            console.log('Extraction verified: Title and content match expected keywords.');
        } else {
            console.log('Extraction warning: Title or content does not contain expected keywords.');
        }
    } catch (error) {
        console.error('Verification FAILED:', error.message);
    }
}

verify();
