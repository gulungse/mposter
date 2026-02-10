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
        
        // Supadata.ai API allows passing the YouTube URL directly
        const response = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=https://www.youtube.com/watch?v=${videoId}`, {
            headers: {
                'x-api-key': apiKey
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Supadata API 오류: ${response.statusText} (${response.status})`);
        }

        const result = await response.json();
        
        let transcriptText = '';
        if (Array.isArray(result.content)) {
            // If it's an array of objects [ { text: '...', start: 0 }, ... ]
            transcriptText = result.content.map((item: any) => item.text || '').join(' ');
        } else if (typeof result.content === 'string') {
            // If it's already a string
            transcriptText = result.content;
        }

        if (!transcriptText) {
            throw new Error('자막을 불러올 수 없습니다. 자막이 비활성화된 영상이거나 지원하지 않는 포맷일 수 있습니다.');
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
