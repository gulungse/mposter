'use server'

import { YoutubeTranscript } from 'youtube-transcript';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execPromise = promisify(exec);

/**
 * Extracts Video ID from various YouTube URL formats
 */
function extractVideoId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
}

/**
 * Fetches transcript for a given YouTube URL
 */
export async function getYoutubeTranscriptAction(url: string) {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            throw new Error('유효하지 않은 유튜브 URL입니다.');
        }

        console.log(`Attempting Node transcript fetch for videoId: ${videoId}`);
        let transcriptText = '';

        try {
            const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, {
                lang: 'ko' // Default to Korean
            }).catch(async () => {
                // If Korean fails, try fetching without language constraint (default)
                return await YoutubeTranscript.fetchTranscript(videoId);
            });

            if (transcriptItems && transcriptItems.length > 0) {
                transcriptText = transcriptItems.map(item => item.text).join(' ');
            }
        } catch (nodeError) {
            console.warn('Node transcript fetch failed, trying Python fallback...', nodeError);
        }

        // Fallback to Python API if Node failed or returned empty
        if (!transcriptText) {
            console.log(`Attempting Python API transcript fetch for videoId: ${videoId}`);
            
            // Get base URL for the API call
            const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
            const host = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, '') || 'localhost:3000';
            const baseUrl = `${protocol}://${host}`;
            
            const apiUrl = `${baseUrl}/api/youtube/transcript?v=${videoId}`;
            console.log(`Fetching from API: ${apiUrl}`);

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error(`API response error: ${response.status}`);
                }
                const result = await response.json();
                if (result.success) {
                    transcriptText = result.transcript;
                } else {
                    throw new Error(result.error || '알 수 없는 API 오류가 발생했습니다.');
                }
            } catch (apiError: any) {
                console.error('Python API fetch failed:', apiError);
                
                // Fallback for local development if Vercel CLI is not running
                if (process.env.NODE_ENV === 'development') {
                    console.log('Attempting local Python fallback...');
                    const pythonScriptPath = path.join(process.cwd(), 'lib/youtube/extract_transcript.py');
                    const { stdout } = await execPromise(`python "${pythonScriptPath}" ${videoId}`, { encoding: 'utf8' });
                    const localResult = JSON.parse(stdout);
                    if (localResult.success) {
                        transcriptText = localResult.transcript;
                    } else {
                        throw new Error(localResult.error || '로컬 파이썬 실행 실패');
                    }
                } else {
                    throw new Error(`자막 추출 API 호출 실패: ${apiError.message}`);
                }
            }
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
