export function formatInKST(date: Date | string | number, formatStr: string = 'MM/dd HH:mm:ss'): string {
    const d = new Date(date);
    
    // Intl.DateTimeFormat is built-in and works on Vercel/Node.js to get KST regardless of system time
    const formatter = new Intl.DateTimeFormat('ko-KR', {
        timeZone: 'Asia/Seoul',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

    // Simple replacement for basic patterns
    return formatStr
        .replace('MM', getPart('month'))
        .replace('dd', getPart('day'))
        .replace('HH', getPart('hour'))
        .replace('mm', getPart('minute'))
        .replace('ss', getPart('second'))
        .replace('yyyy', getPart('year'));
}

export function toKSTString(date: Date | string | number): string {
    return new Date(date).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}
