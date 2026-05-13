const cheerio = require('cheerio');

const naverHtml = `
<div class="se-text">
    <p><span>Line 1</span></p>
    <p><span>Line 2</span></p>
    <p><span>&#8203;</span></p>
    <p><span>Line 3</span></p>
</div>
`;

const $ = cheerio.load(naverHtml);

let content = '';
$('.se-text').find('p').each((_, pEl) => {
    let innerHtml = $(pEl).html()?.trim() || '';
    
    // Remove zero width space and &nbsp;
    const cleanHtml = innerHtml.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/&nbsp;/gi, '').trim();
    
    const textContent = $(pEl).text().replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    if (!textContent && !innerHtml.includes('<img') && cleanHtml === '') {
        content += `<br>\n`;
    } else {
        content += `${innerHtml}<br>\n`;
    }
});

console.log(content);
