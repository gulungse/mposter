import axios from 'axios';

interface ImageProviderResult {
    url: string;
    source: string;
    photographer?: string;
}

/**
 * Pixabay에서 이미지 검색
 * - 무료, 넉넉한 레이트 리밋
 * - page 파라미터를 랜덤으로 사용하여 다양성 확보
 */
export async function fetchPixabayImage(apiKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 5) + 1;
        const response = await axios.get(`https://pixabay.com/api/`, {
            params: {
                key: apiKey,
                q: keyword,
                image_type: 'photo',
                orientation: 'horizontal',
                per_page: 5,
                page: randomPage
            },
            timeout: 10000
        });

        const hits = response.data?.hits || [];
        if (hits.length === 0) {
            console.log(`[Pixabay] No results for keyword: "${keyword}"`);
            return null;
        }

        const randomImage = hits[Math.floor(Math.random() * hits.length)];
        return {
            url: randomImage.largeImageURL || randomImage.webformatURL,
            source: 'Pixabay',
            photographer: randomImage.user
        };
    } catch (error: any) {
        console.warn(`[Pixabay] Fetch Error: ${error.message}`);
        return null;
    }
}

export async function fetchPexelsImage(apiKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const response = await axios.get(`https://api.pexels.com/v1/search`, {
            headers: { Authorization: apiKey },
            params: {
                query: keyword,
                orientation: 'landscape',
                per_page: 5,
                page: randomPage
            },
            timeout: 10000
        });

        const photos = response.data?.photos || [];
        if (photos.length === 0) {
            console.log(`[Pexels] No results for keyword: "${keyword}"`);
            return null;
        }

        const photo = photos[Math.floor(Math.random() * photos.length)];
        return {
            url: photo.src?.large2x || photo.src?.large || photo.src?.original,
            source: 'Pexels',
            photographer: photo.photographer
        };
    } catch (error: any) {
        console.warn(`[Pexels] Fetch Error: ${error.message}`);
        return null;
    }
}

export async function fetchUnsplashImage(accessKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 10) + 1;
        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
            headers: { Authorization: `Client-ID ${accessKey}` },
            params: {
                query: keyword,
                orientation: 'landscape',
                per_page: 5,
                page: randomPage
            },
            timeout: 10000
        });

        const results = response.data?.results || [];
        if (results.length === 0) {
            console.log(`[Unsplash] No results for keyword: "${keyword}"`);
            return null;
        }

        const photo = results[Math.floor(Math.random() * results.length)];
        return {
            url: photo.urls?.regular || photo.urls?.full,
            source: 'Unsplash',
            photographer: photo.user?.name
        };
    } catch (error: any) {
        console.warn(`[Unsplash] Fetch Error: ${error.message}`);
        return null;
    }
}

export async function fetchFreepikImage(apiKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 5) + 1; 
        const response = await axios.get(`https://api.freepik.com/v1/resources`, {
            headers: { 'X-Freepik-API-Key': apiKey },
            params: {
                locale: 'en-US',
                term: keyword,
                page: randomPage,
                limit: 5,
                order: 'random'
            },
            timeout: 10000
        });

        const data = response.data?.data || [];
        if (data.length === 0) {
            console.log(`[Freepik] No results for keyword: "${keyword}"`);
            return null;
        }

        const resource = data[Math.floor(Math.random() * data.length)];
        return {
            url: resource.image?.source?.url || resource.preview?.url,
            source: 'Freepik',
            photographer: resource.author?.name
        };
    } catch (error: any) {
        console.warn(`[Freepik] Fetch Error: ${error.message}`);
        return null;
    }
}

export async function fetchRandomImage(settings: any, keyword: string, index: number): Promise<string> {
    const providers: string[] = [];
    
    // [진단] settings 객체 타입 및 내용 확인
    if (typeof settings !== 'object' || settings === null) {
        console.error(`[Image Fetch] Invalid settings type: ${typeof settings}`);
        return '';
    }

    // [수정] 개별 키 상태 확인 (최소 5자 이상인 경우만 유효)
    providers.push(...Object.entries(settings)
        .filter(([key, val]) => {
            const isTarget = ['pixabayApiKey', 'pexelsApiKey', 'unsplashAccessKey', 'freepikApiKey'].includes(key);
            if (isTarget) {
                const valStr = String(val || '');
                return valStr.length > 5;
            }
            return false;
        })
        .map(([key]) => {
            if (key === 'pixabayApiKey') return 'PIXABAY';
            if (key === 'pexelsApiKey') return 'PEXELS';
            if (key === 'unsplashAccessKey') return 'UNSPLASH';
            if (key === 'freepikApiKey') return 'FREEPIK';
            return '';
        })
        .filter(v => v !== '')
    );

    if (providers.length === 0) {
        return '';
    }

    // 우선 선택된 프로바이더
    let selectedProvider = providers[(index - 1) % providers.length];
    console.log(`[Image Fetch] Index: ${index}, Keyword: "${keyword}", Provider: ${selectedProvider}`);

    const tryFetch = async (provider: string): Promise<string> => {
        let res: ImageProviderResult | null = null;
        switch (provider) {
            case 'PIXABAY': res = await fetchPixabayImage(settings.pixabayApiKey, keyword); break;
            case 'PEXELS': res = await fetchPexelsImage(settings.pexelsApiKey, keyword); break;
            case 'UNSPLASH': res = await fetchUnsplashImage(settings.unsplashAccessKey, keyword); break;
            case 'FREEPIK': res = await fetchFreepikImage(settings.freepikApiKey, keyword); break;
        }
        return res?.url || '';
    };

    let finalUrl = await tryFetch(selectedProvider);

    // 실패 시 다른 모든 사용 가능 프로바이더 순차 시도
    if (!finalUrl && providers.length > 1) {
        for (const p of providers) {
            if (p === selectedProvider) continue;
            console.log(`[Image Fetch] Attempting fallback provider: ${p}`);
            finalUrl = await tryFetch(p);
            if (finalUrl) break;
        }
    }

    if (!finalUrl) {
        console.warn(`[Image Fetch] All configured providers failed for keyword: "${keyword}"`);
    }

    return finalUrl;
}
