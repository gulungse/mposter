const axios = require('axios');

const CRON_URL = 'http://localhost:3000/api/cron';
const INTERVAL_MS = 60 * 1000; // 1분 (정밀도 향상)

console.log('=== 👀 로컬 자동화 시뮬레이터 시작 ===');
console.log(`대상 주소: ${CRON_URL}`);
console.log(`실행 주기: 5분`);
console.log('Ctrl+C를 누르면 종료됩니다.\n');

// 1. 즉시 실행 함수
async function triggerCron() {
    try {
        console.log(`[${new Date().toLocaleTimeString()}] ⏰ 자동화 작업 확인 중...`);
        const response = await axios.get(CRON_URL);
        console.log(`✅ 응답:`, response.data);
    } catch (error) {
        console.error(`❌ 실패: ${error.message}`);
        if (error.response) {
            console.error(`   상태 코드: ${error.response.status}`);
            console.error(`   데이터:`, error.response.data);
        }
    }
}

// 2. 최초 1회 실행
triggerCron();

// 3. 주기적 실행
setInterval(() => {
    triggerCron();
}, INTERVAL_MS);
