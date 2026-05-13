const axios = require('axios');
const cheerio = require('cheerio');

async function getUrl() {
    try {
        const res = await axios.get('https://section.blog.naver.com/BlogHome.naver?directoryNo=0&currentPage=1&groupId=0');
        const $ = cheerio.load(res.data);
        console.log("HTML length:", res.data.length);
        // Find any blog url
        const match = res.data.match(/https:\/\/blog\.naver\.com\/[a-zA-Z0-9_]+\/[0-9]+/);
        if (match) {
            console.log("Found URL:", match[0]);
            const { scrapeNaverBlog } = require('./lib/scraper');
            const result = await scrapeNaverBlog(match[0]);
            console.log("TITLE:", result.title);
            console.log("CONTENT LENGTH:", result.content.length);
        } else {
            console.log("No URL found in section");
        }
    } catch(e) {
        console.error(e);
    }
}
getUrl();
