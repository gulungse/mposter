#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== Mpster Ubuntu Server Setup ===${NC}"

# 1. PM2 설치 확인
if ! command -v pm2 &> /dev/null; then
    echo -e "${GREEN}[1/4] PM2 설치 중...${NC}"
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo -e "${RED}PM2 설치 실패. 'sudo'를 사용하여 스크립트를 실행했나요?${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[1/4] PM2 이미 설치됨.${NC}"
fi

# 2. 애플리케이션 빌드
echo -e "${GREEN}[2/4] Next.js 앱 빌드 중...${NC}"
npm install
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}빌드 실패. 에러 로그를 확인하세요.${NC}"
    exit 1
fi

# 3. PM2로 앱 시작
echo -e "${GREEN}[3/4] 서버 시작 (PM2)...${NC}"
pm2 delete mposter 2>/dev/null || true
pm2 start npm --name "mposter" -- start

# 4. 재부팅 자동실행 설정
echo -e "${GREEN}[4/4] 재부팅 자동실행 등록...${NC}"
pm2 save
# startup 명령은 root 권한이 필요할 수 있어, 사용자가 직접 복붙하게 하는 게 안전하지만
# 여기서는 시도 후 안내
PM2_STARTUP=$(pm2 startup | grep "sudo")
if [ -n "$PM2_STARTUP" ]; then
    echo -e "${CYAN}알림: 아래 명령어를 복사해서 터미널에 붙여넣으세요 (재부팅 설정):${NC}"
    echo -e "$PM2_STARTUP"
fi

# 5. Cron 등록 (1분 주기 - 정밀도 향상)
echo -e "${GREEN}[5/5] 자동화 스케줄러(Cron) 등록 중 (1분 주기)...${NC}"
# 기존 작업 삭제 (중복 방지)
(crontab -l 2>/dev/null | grep -v "api/cron") | crontab -
# 새 작업 추가 - 1분마다 실행
(crontab -l 2>/dev/null; echo "* * * * * curl -s http://localhost:3000/api/cron >/dev/null 2>&1") | crontab -

echo -e "${CYAN}=== ✅ 설정 완료! ===${NC}"
echo -e "이제 터미널을 꺼도 서버는 계속 돌아갑니다."
echo -e "상태 확인: pm2 status"
