// 프론트엔드의 모든 FarmMate 데이터를 삭제하는 스크립트
// 브라우저 개발자 도구의 Console에서 실행하세요

console.log('🧹 FarmMate 프론트엔드 데이터 정리 시작...');

// 1. 로컬 스토리지에서 FarmMate 관련 모든 데이터 삭제
function clearLocalStorage() {
  const keysToDelete = [];
  
  // 모든 localStorage 키 확인
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (
      key.startsWith('farmmate-') || 
      key.startsWith('fm_') ||
      key.startsWith('supabase.') ||
      key.includes('farmmate') ||
      key.includes('task') ||
      key.includes('crop') ||
      key.includes('farm')
    )) {
      keysToDelete.push(key);
    }
  }
  
  // 발견된 키들 삭제
  keysToDelete.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ 삭제됨: ${key}`);
  });
  
  console.log(`📊 로컬 스토리지에서 ${keysToDelete.length}개 항목 삭제됨`);
}

// 2. 세션 스토리지에서 FarmMate 관련 데이터 삭제
function clearSessionStorage() {
  const keysToDelete = [];
  
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (
      key.startsWith('farmmate-') || 
      key.startsWith('fm_') ||
      key.startsWith('supabase.') ||
      key.includes('farmmate') ||
      key.includes('task') ||
      key.includes('crop') ||
      key.includes('farm')
    )) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => {
    sessionStorage.removeItem(key);
    console.log(`✅ 세션 삭제됨: ${key}`);
  });
  
  console.log(`📊 세션 스토리지에서 ${keysToDelete.length}개 항목 삭제됨`);
}

// 3. IndexedDB 정리 (Supabase 캐시 등)
function clearIndexedDB() {
  if ('indexedDB' in window) {
    indexedDB.databases().then(databases => {
      databases.forEach(db => {
        if (db.name && (
          db.name.includes('supabase') || 
          db.name.includes('farmmate') ||
          db.name.includes('farm')
        )) {
          console.log(`🗑️ IndexedDB 삭제 시도: ${db.name}`);
          indexedDB.deleteDatabase(db.name);
        }
      });
    }).catch(err => {
      console.log('IndexedDB 정리 중 오류:', err);
    });
  }
}

// 4. 쿠키 정리
function clearCookies() {
  const cookies = document.cookie.split(";");
  let deletedCount = 0;
  
  cookies.forEach(cookie => {
    const eqPos = cookie.indexOf("=");
    const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
    
    if (name && (
      name.includes('farmmate') ||
      name.includes('supabase') ||
      name.includes('farm') ||
      name.includes('task')
    )) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      console.log(`🍪 쿠키 삭제됨: ${name}`);
      deletedCount++;
    }
  });
  
  console.log(`📊 ${deletedCount}개 쿠키 삭제됨`);
}

// 5. 캐시 스토리지 정리
async function clearCacheStorage() {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      let deletedCount = 0;
      
      for (const cacheName of cacheNames) {
        if (cacheName.includes('farmmate') || 
            cacheName.includes('supabase') ||
            cacheName.includes('farm')) {
          await caches.delete(cacheName);
          console.log(`💾 캐시 삭제됨: ${cacheName}`);
          deletedCount++;
        }
      }
      
      console.log(`📊 ${deletedCount}개 캐시 삭제됨`);
    } catch (err) {
      console.log('캐시 정리 중 오류:', err);
    }
  }
}

// 모든 정리 작업 실행
async function clearAllFrontendData() {
  console.log('🚀 전체 데이터 정리 시작...');
  
  clearLocalStorage();
  clearSessionStorage();
  clearIndexedDB();
  clearCookies();
  await clearCacheStorage();
  
  console.log('✨ 모든 프론트엔드 데이터가 정리되었습니다!');
  console.log('🔄 페이지를 새로고침하여 변경사항을 확인하세요.');
  
  // 자동으로 페이지 새로고침 (선택사항)
  if (confirm('페이지를 새로고침하시겠습니까?')) {
    window.location.reload();
  }
}

// 즉시 실행
clearAllFrontendData();

// 전역 함수로도 등록 (나중에 다시 사용할 수 있도록)
window.clearAllFarmMateData = clearAllFrontendData;
window.clearFarmMateLocalStorage = clearLocalStorage;

console.log('💡 언제든 window.clearAllFarmMateData()를 실행하여 데이터를 정리할 수 있습니다.');
