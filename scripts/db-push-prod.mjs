import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 운영 서버 DB 업데이트를 위한 자동화 스크립트
 */

const PROD_ENV_FILE = '.env.prod';

async function run() {
    console.log('🚀 운영 서버 DB 업데이트를 시작합니다...');

    // 1. .env.prod 파일 존재 확인
    if (!fs.existsSync(PROD_ENV_FILE)) {
        console.error(`❌ 에러: ${PROD_ENV_FILE} 파일이 없습니다.`);
        console.log('\n해결 방법:');
        console.log('1. 프로젝트 루트에 .env.prod 파일을 생성하세요.');
        console.log('2. 운영 서버의 DATABASE_URL을 입력하세요 (예: DATABASE_URL="...")');
        process.exit(1);
    }

    try {
        console.log('📡 운영 서버 DB 스키마 동기화 중 (db push)...');
        // cross-env 대신 직접 환경 변수 설정하여 실행
        execSync(`npx prisma db push --accept-data-loss`, {
            env: {
                ...process.env,
                ...Object.fromEntries(
                    fs.readFileSync(PROD_ENV_FILE, 'utf-8')
                    .split('\n')
                    .filter(line => line.includes('='))
                    .map(line => {
                        const [key, ...val] = line.split('=');
                        return [key.trim(), val.join('=').trim().replace(/"/g, '')];
                    })
                )
            },
            stdio: 'inherit'
        });

        console.log('✅ DB 스키마 업데이트 완료!');
        
        console.log('🛠 Prisma Client 재생성 중...');
        execSync('npx prisma generate', { stdio: 'inherit' });
        
        console.log('\n✨ 모든 작업이 성공적으로 완료되었습니다!');
        console.log('이제 운영 서버에 코드를 배포하시면 됩니다.');

    } catch (error) {
        console.error('\n❌ 작업 중 오류가 발생했습니다:');
        console.error(error.message);
        
        if (error.message.includes('EPERM')) {
            console.log('\n💡 팁: Windows에서 파일 잠금 오류가 발생하면 npm run dev 서버를 잠시 끄고 다시 실행해 보세요.');
        }
        process.exit(1);
    }
}

run();
