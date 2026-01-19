/**
 * Cron 문자열(또는 식별자)에 따라 다음 실행 시간을 계산합니다.
 * 사용자의 요청에 따라 정각으로 스냅하지 않고, 기준 시간(fromDate)로부터 상대적인 간격을 더합니다.
 */
export function calculateNextRun(cron: string, fromDate: Date = new Date()): Date {
    const next = new Date(fromDate.getTime()) // Clone

    if (cron.startsWith('*/5')) {
        next.setMinutes(next.getMinutes() + 5)
    } else if (cron.startsWith('*/10')) {
        next.setMinutes(next.getMinutes() + 10)
    } else if (cron.startsWith('*/30')) {
        next.setMinutes(next.getMinutes() + 30)
    } else if (cron === '0 * * * *') {
        next.setHours(next.getHours() + 1)
    } else if (cron === '0 */3 * * *') {
        next.setHours(next.getHours() + 3)
    } else if (cron === '0 */6 * * *') {
        next.setHours(next.getHours() + 6)
    } else if (cron === '0 */12 * * *') {
        next.setHours(next.getHours() + 12)
    } else if (cron === '0 0 * * *') {
        next.setDate(next.getDate() + 1)
    } else if (cron === '0 0 */2 * *') {
        next.setDate(next.getDate() + 2)
    } else {
        // Fallback or Manual: Default 1 hour safety if unknown
        // But if 'MANUAL', it usually shouldn't call this. 
        // We'll just add 1 hour as safety.
        next.setHours(next.getHours() + 1)
    }

    return next
}
