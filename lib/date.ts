export function formatInKST(date: Date | string | number, formatStr: string = 'MM/dd HH:mm:ss'): string {
    const d = new Date(date);
    
    // Vercel server time is usually UTC. 
    // We use Intl.DateTimeFormat with Asia/Seoul to get the correct parts.
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        });

        const parts = formatter.formatToParts(d);
        const p: Record<string, string> = {};
        parts.forEach(part => { p[part.type] = part.value; });

        return formatStr
            .replace('yyyy', p.year)
            .replace('MM', p.month)
            .replace('dd', p.day)
            .replace('HH', p.hour)
            .replace('mm', p.minute)
            .replace('ss', p.second);
    } catch (e) {
        // Fallback: manually add 9 hours if Intl fails (though unlikely in modern Node.js)
        const kstDate = new Date(d.getTime() + (9 * 60 * 60 * 1000));
        return kstDate.toISOString().replace('T', ' ').substring(5, 19);
    }
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
