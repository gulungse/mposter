'use client'
import { useEffect } from 'react'

export function CronTicker() {
    useEffect(() => {
        const tick = () => {
            fetch('/api/cron').catch(err => console.error('Cron tick failed', err))
        }
        // Run immediately on mount (checks for missed tasks)
        tick()
        // Then every 60 seconds
        const interval = setInterval(tick, 60000)
        return () => clearInterval(interval)
    }, [])

    return null
}
