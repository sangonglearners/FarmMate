# PowerShell 스크립트 - 변경사항이 있으면 일반 커밋, 없으면 빈 커밋으로 배포 트리거

# 변경사항 확인
$status = git status --porcelain

if ($status) {
    # 변경사항이 있으면 일반 커밋
    Write-Host "변경사항이 있습니다. 일반 커밋을 진행합니다..." -ForegroundColor Yellow
    Write-Host "커밋 메시지를 입력하세요 (엔터: 기본 메시지): " -NoNewline
    $message = Read-Host
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "chore: deploy"
    }
    git add .
    git commit -m $message
} else {
    # 변경사항이 없으면 빈 커밋
    Write-Host "변경사항이 없습니다. 빈 커밋으로 배포를 트리거합니다..." -ForegroundColor Cyan
    git commit --allow-empty -m "chore: trigger deployment"
}

# 푸시
git push

Write-Host "✅ 배포 트리거 완료!" -ForegroundColor Green

