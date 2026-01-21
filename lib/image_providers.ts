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
        // 1~20페이지 중 랜덤 선택 (검색 결과가 충분하다고 가정)
        const randomPage = Math.floor(Math.random() * 20) + 1;
        const response = await axios.get(`https://pixabay.com/api/`, {
            params: {
                key: apiKey,
                q: keyword,
                image_type: 'photo',
                orientation: 'horizontal',
                per_page: 3,
                page: randomPage
            },
            timeout: 10000
        });

        const hits = response.data?.hits || [];
        if (hits.length === 0) return null;

        // 결과 중 랜덤 선택
        const randomImage = hits[Math.floor(Math.random() * hits.length)];
        return {
            url: randomImage.largeImageURL || randomImage.webformatURL,
            source: 'Pixabay',
            photographer: randomImage.user
        };
    } catch (error) {
        console.warn('Pixabay Fetch Error:', error);
        return null;
    }
}

/**
 * Pexels에서 이미지 검색
 * - 무료, 퀄리티 높음
 * - page 파라미터 랜덤 사용
 */
export async function fetchPexelsImage(apiKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 20) + 1;
        const response = await axios.get(`https://api.pexels.com/v1/search`, {
            headers: { Authorization: apiKey },
            params: {
                query: keyword,
                orientation: 'landscape',
                per_page: 1,
                page: randomPage
            },
            timeout: 10000
        });

        const photos = response.data?.photos || [];
        if (photos.length === 0) return null;

        const photo = photos[0];
        return {
            url: photo.src?.large2x || photo.src?.large || photo.src?.original,
            source: 'Pexels',
            photographer: photo.photographer
        };
    } catch (error) {
        console.warn('Pexels Fetch Error:', error);
        return null;
    }
}

/**
 * Unsplash에서 이미지 검색
 * - 무료 데모는 시간당 50회 제한 (주의)
 * - page 랜덤 사용
 */
export async function fetchUnsplashImage(accessKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        const randomPage = Math.floor(Math.random() * 10) + 1; // Unsplash는 제한이 빡세므로 페이지 범위 축소
        const response = await axios.get(`https://api.unsplash.com/search/photos`, {
            headers: { Authorization: `Client-ID ${accessKey}` },
            params: {
                query: keyword,
                orientation: 'landscape',
                per_page: 1,
                page: randomPage
            },
            timeout: 10000
        });

        const results = response.data?.results || [];
        if (results.length === 0) return null;

        const photo = results[0];
        return {
            url: photo.urls?.regular || photo.urls?.full,
            source: 'Unsplash',
            photographer: photo.user?.name
        };
    } catch (error) {
        console.warn('Unsplash Fetch Error:', error);
        return null;
    }
}

/**
 * Freepik에서 이미지 검색
 * - 유료/크레딧 가능성 있음
 * - API 구조가 변경될 수 있음 (문서 확인 필요)
 */
export async function fetchFreepikImage(apiKey: string, keyword: string): Promise<ImageProviderResult | null> {
    try {
        // Freepik API v1 Resources Search
        // X-Freepik-API-Key 헤더 사용
        const randomPage = Math.floor(Math.random() * 5) + 1; 
        const response = await axios.get(`https://api.freepik.com/v1/resources`, {
            headers: { 'X-Freepik-API-Key': apiKey },
            params: {
                locale: 'en-US',
                term: keyword,
                page: randomPage,
                limit: 1,
                order: 'random' // Freepik은 random 정렬 지원
            },
            timeout: 10000
        });

        const data = response.data?.data || [];
        if (data.length === 0) return null;

        const resource = data[0];
        // Preview URL 사용 (정식 다운로드는 별도 API일 수 있음)
        return {
            url: resource.image?.source?.url || resource.preview?.url,
            source: 'Freepik',
            photographer: resource.author?.name
        };
    } catch (error) {
        console.warn('Freepik Fetch Error:', error);
        return null;
    }
}

/**
 * 통합 이미지 검색 함수
 * - 설정된 API 키들을 확인하고, 사용 가능한 프로바이더 중에서 하나를 선택하여 검색
 * - Index(이미지 순번)에 따라 프로바이더를 순환하거나 랜덤 선택
 */
export async function fetchRandomImage(settings: any, keyword: string, index: number): Promise<string> {
    const providers: string[] = [];

    // 사용 가능한 프로바이더 확인
    if (settings.pixabayApiKey) providers.push('PIXABAY');
    if (settings.pexelsApiKey) providers.push('PEXELS');
    if (settings.unsplashAccessKey) providers.push('UNSPLASH');
    if (settings.freepikApiKey) providers.push('FREEPIK');

    if (providers.length === 0) return ''; // 설정된 키가 없음

    // 프로바이더 선택 로직 (순환 + 랜덤)
    // 4개의 이미지가 모두 달라야 하므로, 가능한 한 분산시킴
    // index 1 -> Provider A
    // index 2 -> Provider B
    // ...
    let selectedProvider = providers[(index - 1) % providers.length];

    // 만약 프로바이더가 하나만 있으면 그것만 계속 사용 (페이지 랜덤이므로 중복 안됨)
    
    console.log(`[Image Fetch] Index: ${index}, Keyword: "${keyword}", Provider: ${selectedProvider}`);

    let result: ImageProviderResult | null = null;

    try {
        switch (selectedProvider) {
            case 'PIXABAY':
                result = await fetchPixabayImage(settings.pixabayApiKey, keyword);
                break;
            case 'PEXELS':
                result = await fetchPexelsImage(settings.pexelsApiKey, keyword);
                break;
            case 'UNSPLASH':
                result = await fetchUnsplashImage(settings.unsplashAccessKey, keyword);
                break;
            case 'FREEPIK':
                result = await fetchFreepikImage(settings.freepikApiKey, keyword);
                break;
        }
    } catch (e) {
        console.error(`Provider ${selectedProvider} Failed, trying fallback...`);
    }

    // 실패 시 다른 프로바이더 랜덤 시도 (Fallback)
    if (!result && providers.length > 1) {
        const fallbackProvider = providers.filter(p => p !== selectedProvider)[Math.floor(Math.random() * (providers.length - 1))];
        console.log(`[Image Fetch] Fallback to: ${fallbackProvider}`);
        switch (fallbackProvider) {
             case 'PIXABAY': result = await fetchPixabayImage(settings.pixabayApiKey, keyword); break;
             case 'PEXELS': result = await fetchPexelsImage(settings.pexelsApiKey, keyword); break;
             case 'UNSPLASH': result = await fetchUnsplashImage(settings.unsplashAccessKey, keyword); break;
             case 'FREEPIK': result = await fetchFreepikImage(settings.freepikApiKey, keyword); break;
        }
    }

    return result?.url || '';
}
