import { Innertube } from 'youtubei.js';

async function test() {
    console.log('Testing with YouTubei.js...');
    try {
        const youtube = await Innertube.create();
        const info = await youtube.getInfo('SuOR-A-2Q-M');
        
        console.log('Video Title:', info.basic_info.title);
        
        const transcriptData = await info.getTranscript();
        console.log('Transcript available languages:', transcriptData.transcript.content.body.initial_segments.length > 0 ? 'Yes' : 'No');
        
        if (transcriptData.transcript.content.body.initial_segments.length > 0) {
            const fullText = transcriptData.transcript.content.body.initial_segments
                .map(segment => segment.snippet.text)
                .join(' ');
            
            console.log('Success! Length:', fullText.length);
            console.log('Snippet:', fullText.substring(0, 200));
        } else {
            console.log('Transcript segments are empty.');
        }

    } catch (e) {
        console.log('YouTubei Failed:', e.message);
    }
}

test();
