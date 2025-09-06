// 브라우저 개발자 도구 Console에서 실행하세요
// 모든 FarmMate 관련 로컬 데이터 삭제

(function() {
  console.log('🧹 FarmMate 데이터 삭제 시작...');
  
  const localKeys = [];
  const sessionKeys = [];
  
  // 로컬 스토리지 정리
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.includes('farmmate') || 
      key.includes('farm') || 
      key.includes('task') || 
      key.includes('crop') || 
      key.includes('supabase') ||
      key.startsWith('fm_')
    )) {
      localKeys.push(key);
    }
  }
  
  localKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 로컬 스토리지 삭제: ${key}`);
  });
  
  // 세션 스토리지 정리
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.includes('farmmate') || 
      key.includes('farm') || 
      key.includes('task') || 
      key.includes('crop') || 
      key.includes('supabase') ||
      key.startsWith('fm_')
    )) {
      sessionKeys.push(key);
    }
  }
  
  sessionKeys.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 세션 스토리지 삭제: ${key}`);
  });
  
  console.log(`🗑️ 총 ${localKeys.length + sessionKeys.length}개 항목이 삭제되었습니다.`);
  console.log('✅ 모든 FarmMate 프론트엔드 데이터가 삭제되었습니다!');
  
  alert(`프론트엔드 데이터 ${localKeys.length + sessionKeys.length}개 항목이 삭제되었습니다. 페이지를 새로고침하세요.`);
  
  // 자동 새로고침 (선택사항)
  if (confirm('페이지를 새로고침하시겠습니까?')) {
    window.location.reload();
  }
})();
