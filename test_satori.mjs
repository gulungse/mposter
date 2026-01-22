import satori from 'satori';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock React createElement for simple object structure if not using React directly
// But since we installed satori, we can pass the object structure directly or use a helper
// Satori accepts an object: { type: 'div', props: { style: {...}, children: [...] } }

function h(type, props, children) {
    return {
        type,
        props: {
            ...props,
            children: children
        }
    };
}

async function testGen() {
    console.log("Starting Satori Test...");
    const width = 500;
    const height = 500;
    const text = "중고차 딜러가 기피하는 전차주 유형, 당신";
    
    const hue = 100;
    const bgColor = `hsl(${hue}, 70%, 85%)`;
    const borderColor = `hsl(${hue}, 80%, 30%)`;

    const fontPath = join(process.cwd(), 'public', 'fonts', 'NanumGothic-Bold.ttf');
    console.log("Reading font from:", fontPath);
    
    let fontData;
    try {
        fontData = readFileSync(fontPath);
    } catch (e) {
        console.error("Failed to read font file:", e.message);
        return;
    }

    const element = h('div', {
        style: {
            display: 'flex',
            width: '100%',
            height: '100%',
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
        }
    }, [
        h('div', {
            style: {
                position: 'absolute',
                top: 15,
                left: 15,
                right: 15,
                bottom: 15,
                border: `15px solid ${borderColor}`,
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }
        }, [
            h('div', {
                style: {
                    color: borderColor,
                    fontSize: 45,
                    fontWeight: 900,
                    textAlign: 'center',
                    wordBreak: 'keep-all',
                    lineHeight: 1.3,
                    padding: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }
            }, text)
        ])
    ]);

    try {
        const svg = await satori(element, {
            width,
            height,
            fonts: [
                {
                    name: 'NanumGothic',
                    data: fontData,
                    weight: 700,
                    style: 'normal',
                },
            ],
        });
        
        writeFileSync('test_output.svg', svg);
        console.log("Success! SVG written to test_output.svg");
    } catch (e) {
        console.error("Satori generation failed:", e);
    }
}

testGen();
