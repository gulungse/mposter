import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import axios from 'axios';

// Force dynamic rendering since we are scraping real-time data
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Fetching trending keywords from Signal.bz...');

        // Use more browser-like headers to avoid being blocked
        const response = await axios.get('https://www.signal.bz/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            },
            timeout: 5000 // 5 second timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);
        const keywords: string[] = [];

        // Strategy 1: .rank-text (Standard desktop/mobile view)
        $('.rank-text').each((i, el) => {
            if (keywords.length < 10) {
                const text = $(el).text().trim();
                if (text) keywords.push(text);
            }
        });

        // Strategy 2: Fallback if .rank-text is not found or empty
        if (keywords.length === 0) {
            console.log('Strategy 1 failed, trying fallback...');
            // Try looking for span elements inside rank layers
            $('div[class*="rank"] span').each((i, el) => {
                if (keywords.length < 10) {
                    const text = $(el).text().trim();
                    // Basic filtering: ignore small numbers often used for ranking (1, 2, 3...)
                    if (text && text.length > 1 && isNaN(Number(text))) {
                        keywords.push(text);
                    }
                }
            });
        }

        // Check if we successfully got keywords
        if (keywords.length === 0) {
            console.warn('No keywords found on Signal.bz');
            // Return debug info to help the user diagnose
            return NextResponse.json({
                error: 'No keywords found',
                debug: {
                    htmlLength: html?.length || 0,
                    status: response.status,
                    preview: html ? html.substring(0, 200) : 'Empty'
                }
            }, { status: 500 });
        }

        // Remove duplicates just in case
        const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 10);

        return NextResponse.json({
            source: 'signal.bz',
            updatedAt: new Date().toISOString(),
            keywords: uniqueKeywords
        });

    } catch (error: any) {
        console.error('Signal.bz scraping failed:', error.message);
        return NextResponse.json(
            {
                error: 'Failed to fetch trending keywords',
                details: error.message
            },
            { status: 500 }
        );
    }
}
