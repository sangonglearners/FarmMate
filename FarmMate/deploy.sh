#!/bin/bash
# 빈 커밋으로 배포 트리거하는 스크립트

# 빈 커밋 생성
git commit --allow-empty -m "chore: trigger deployment"

# 푸시
git push

echo "✅ 배포 트리거 완료!"

