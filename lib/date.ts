export function formatInKST(date: Date | string | number, formatStr: string = 'MM/dd HH:mm:ss'): string {
    const d = new Date(date);
    
    // Vercel server might ignore 'TZ' or have limited ICU data.
    // To be 100% sure, we calculate the KST date by adding 9 hours to the UTC time.
    const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000); // Back to UTC
    const kstDate = new Date(utc + (9 * 60 * 60 * 1000)); // Add 9 hours

    const pad = (n: number) => n.toString().padStart(2, '0');
    
    const year = kstDate.getFullYear().toString();
    const month = pad(kstDate.getMonth() + 1);
    const day = pad(kstDate.getDate());
    const hour = pad(kstDate.getHours());
    const minute = pad(kstDate.getMinutes());
    const second = pad(kstDate.getSeconds());

    return formatStr
        .replace('yyyy', year)
        .replace('MM', month)
        .replace('dd', day)
        .replace('HH', hour)
        .replace('mm', minute)
        .replace('ss', second);
}

export function toKSTString(date: Date | string | number): string {
    const d = new Date(date);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
    const kstDate = new Date(utc + (9 * 60 * 60 * 1000));
    
    return `${kstDate.getFullYear()}년 ${kstDate.getMonth() + 1}월 ${kstDate.getDate()}일 ${pad2(kstDate.getHours())}:${pad2(kstDate.getMinutes())}`;
}

function pad2(n: number) { return n.toString().padStart(2, '0'); }
