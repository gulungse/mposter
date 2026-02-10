'use server'

/**
 * Extracts Video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Fetches transcript for a given YouTube URL using Supadata.ai
 */
export async function getYoutubeTranscriptAction(url: string) {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('유효하지 않은 유튜브 URL입니다.');
        }

        const apiKey = process.env.SUPADATA_API_KEY;
        if (!apiKey) {
            throw new Error('Supadata API 키가 설정되지 않았습니다.');
        }

        console.log(`Fetching transcript via Supadata for videoId: ${videoId}`);
        
        // 1. Try fetching Korean transcript first
        let transcriptUrl = `https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}&lang=ko`;
        let response = await fetch(transcriptUrl, {
            headers: { 'x-api-key': apiKey }
        });

        // 2. If Korean specifically fails, try without language constraint to get whatever is default
        if (!response.ok) {
            console.log(`Korean transcript (ko) not found, retrying without language constraint...`);
            transcriptUrl = `https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`;
            response = await fetch(transcriptUrl, {
                headers: { 'x-api-key': apiKey }
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Supadata API 오류: ${response.statusText} (${response.status})`);
        }

        const result = await response.json();
        
        let transcriptText = '';
        
        // --- Robust Parsing Logic ---
        // Supadata sometimes returns a raw array, sometimes an object with 'content'
        if (Array.isArray(result)) {
            transcriptText = result.map((item: any) => item.text || '').join(' ').trim();
        } else if (result && Array.isArray(result.content)) {
            transcriptText = result.content.map((item: any) => item.text || '').join(' ').trim();
        } else if (result && typeof result.content === 'string') {
            transcriptText = result.content.trim();
        } else if (typeof result === 'string') {
            transcriptText = result.trim();
        }

        if (!transcriptText) {
            throw new Error('자막 내용을 찾을 수 없습니다. 자막이 없는 영상이거나 다른 언어를 선택해 주세요.');
        }

        return {
            success: true,
            data: {
                videoId,
                transcript: transcriptText
            }
        };
    } catch (error: any) {
        console.error('YouTube Transcript Action Error:', error);
        return {
            success: false,
            error: error.message || '유튜브 스크립트를 가져오는 중 오류가 발생했습니다.'
        };
    }
}
