const cheerio = require('cheerio');

async function testImageInsertion() {
    const htmlContent = `
        <h1>Main Title</h1>
        <p>Intro paragraph...</p>
        <h2>Heading 1 (Index 0)</h2>
        <p>Text after H1...</p>
        <h3>Heading 2 (Index 1)</h3>
        <p>Text after H2...</p>
        <h2>Heading 3 (Index 2)</h2>
        <p>Text after H3...</p>
        <h3>Heading 4 (Index 3)</h3>
        <p>Text after H4...</p>
        <h2>Heading 5 (Index 4)</h2>
        <p>Text after H5...</p>
        <h3>Heading 6 (Index 5)</h3>
        <p>Text after H6...</p>
        <h2>Heading 7 (Index 6)</h2>
        <p>Text after H7...</p>
    `;

    const $ = cheerio.load(htmlContent);
    const headings = $('h2, h3');
    const imageCount = 5;

    console.log(`Total Headings Found: ${headings.length}`);

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
            console.log(`[Image ${i}] Skipped: Low heading count`);
            continue;
        }

        const targetHeading = $(headings[rule.headIdx]);
        const imgTag = `<img src="IMG_${i}" />`;

        if (rule.pos === 'before') {
            console.log(`[Image ${i}] Inserting BEFORE Heading Index ${rule.headIdx}: ${targetHeading.text()}`);
            targetHeading.before(imgTag);
        } else {
            console.log(`[Image ${i}] Inserting AFTER Heading Index ${rule.headIdx}: ${targetHeading.text()}`);
            targetHeading.after(imgTag);
        }
    }

    console.log('\n--- Final HTML Structure (Simplified) ---');
    $('h2, h3, img').each((i, el) => {
        if (el.tagName === 'img') console.log(`[IMG] ${$(el).attr('src')}`);
        else console.log(`[${el.tagName.toUpperCase()}] ${$(el).text()}`);
    });
}

testImageInsertion();
