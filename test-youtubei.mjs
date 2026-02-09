import { Innertube } from 'youtubei.js';

async function test() {
    console.log('Testing SuOR-A-2Q-M with youtubei.js...');
    try {
        const youtube = await Innertube.create();
        const info = await youtube.getInfo('SuOR-A-2Q-M');
        
        console.log('Fetching transcript...');
        const transcript = await info.getTranscript();
        
        if (transcript && transcript.transcript_panels) {
            console.log('SUCCESS! Found transcript panels.');
            // Extract text segments
            let fullText = '';
            for (const panel of transcript.transcript_panels) {
                if (panel.body && panel.body.initial_segments) {
                    for (const segment of panel.body.initial_segments) {
                        fullText += segment.snippet.text + ' ';
                    }
                }
            }
            console.log('Transcript length:', fullText.length);
            console.log('Preview:', fullText.substring(0, 200));
        } else {
            console.log('No transcript found in info.');
        }
    } catch (e) {
        console.log('Error:', e.message);
        if (e.stack) console.log(e.stack);
    }
}

test();
