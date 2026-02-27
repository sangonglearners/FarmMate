import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Camera, Sprout, BookOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { clearCurrentUserTaskData } from '../../../shared/api/clearAllData';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { sendPageView } from "../../../shared/ga";

export default function MyPage() {
  useEffect(() => {
    sendPageView("my_page");
  }, []);

  const [showLogout, setShowLogout] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showClearData, setShowClearData] = useState(false);
  const [userName, setUserName] = useState<string>('사용자');
  const [tempUserName, setTempUserName] = useState<string>('사용자');
  const [isSaving, setIsSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();

  useEffect(() => {
    // user_profiles에서 display_name 가져오기
    const loadUserProfile = async () => {
      if (user?.id) {
        try {
          const { data, error } = await getSupabaseClient()
            .from('user_profiles')
            .select('display_name')
            .eq('id', user.id)
            .single();
          
          if (!error && data?.display_name) {
            setUserName(data.display_name);
            setTempUserName(data.display_name);
            localStorage.setItem('fm_user_name', data.display_name);
          } else {
            // 기존 로직대로
            setUserName(user.user_metadata?.full_name || user.email || '사용자');
            setTempUserName(user.user_metadata?.full_name || user.email || '사용자');
          }
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setUserName(user.user_metadata?.full_name || user.email || '사용자');
          setTempUserName(user.user_metadata?.full_name || user.email || '사용자');
        }
      } else {
        const savedName = localStorage.getItem('fm_user_name');
        const savedAvatar = localStorage.getItem('fm_user_avatar');
        if (savedName) {
          setUserName(savedName);
          setTempUserName(savedName);
        }
        if (savedAvatar) setAvatarUrl(savedAvatar);
      }
    };

    loadUserProfile();
  }, [user]);

  const handleNameChange = (value: string) => {
    setTempUserName(value);
  };

  const handleSaveName = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setUserName(tempUserName);
    localStorage.setItem('fm_user_name', tempUserName);
    
    // user_profiles 테이블도 업데이트
    if (user?.id) {
      try {
        const { error } = await getSupabaseClient()
          .from('user_profiles')
          .update({ display_name: tempUserName })
          .eq('id', user.id);
        
        if (error) {
          console.error('Display name update error:', error);
          alert('이름 저장에 실패했습니다.');
        } else {
          alert('이름이 저장되었습니다.');
        }
      } catch (error) {
        console.error('Failed to update display name:', error);
        alert('이름 저장에 실패했습니다.');
      }
    }
    
    setIsSaving(false);
  };

  const handleAvatarChange = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setAvatarUrl(dataUrl);
      localStorage.setItem('fm_user_avatar', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      console.log('🚪 로그아웃 시작...');
      await signOut();
      console.log('✅ 로그아웃 완료');
      setShowLogout(false);
    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
      // 오류가 발생해도 다이얼로그는 닫기
      setShowLogout(false);
    }
  };

  // 데이터 삭제 처리
  const handleClearData = async () => {
    try {
      await clearCurrentUserTaskData();
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setShowClearData(false);
      alert('모든 작업 데이터가 삭제되었습니다.');
    } catch (error) {
      console.error('데이터 삭제 실패:', error);
      alert('데이터 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <div className="p-4 space-y-6">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">마이페이지</h1>
        <p className="text-gray-600 text-sm">나의 정보를 확인할 수 있습니다</p>
      </div>

      <div className="flex items-center justify-end -mt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2" aria-label="settings">
              <Settings className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setShowLogout(true)}>로그아웃</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWithdraw(true)}>회원탈퇴</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 회원 정보 (프로필, 아이디) */}
      <div className="flex items-center space-x-4">
        <label className="relative cursor-pointer inline-block">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gray-200" />
          )}
          <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center">
            <Camera className="w-5 h-5 text-gray-700" />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleAvatarChange(e.target.files ? e.target.files[0] : null)}
            className="absolute inset-0 opacity-0"
          />
        </label>
        <div className="flex-1 space-y-1">
          <div className="flex gap-2">
            <Input value={tempUserName} onChange={(e) => handleNameChange(e.target.value)} />
            <Button onClick={handleSaveName} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">
            {user?.email ?? '이메일 정보 없음'}
          </p>
        </div>
      </div>

      {/* 상단 카드: 장부 관리 / 농장&작물 관리 */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLocation("/ledger-management")}
          className="w-full rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">장부 관리</p>
              <p className="text-xs text-gray-500">매출 및 비용 내역을 관리합니다</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">세부 정보 보기</span>
        </button>

        <button
          type="button"
          onClick={() => setLocation("/farm-crop-management")}
          className="w-full rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">농장 & 작물 관리</p>
              <p className="text-xs text-gray-500">내 농장과 작물 정보를 관리합니다</p>
            </div>
          </div>
          <span className="text-xs text-gray-400">세부 정보 보기</span>
        </button>
      </div>

      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>로그아웃</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            정말로 로그아웃 하시겠습니까?
            <br />
            <span className="text-xs text-gray-500">다시 로그인하려면 로그인 화면에서 인증이 필요합니다.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogout(false)}>취소</Button>
            <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-700">로그아웃</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>회원탈퇴</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">회원탈퇴 하시겠습니까?</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>취소</Button>
            <Button onClick={() => setShowWithdraw(false)}>확인</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showClearData} onOpenChange={setShowClearData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>데이터 삭제</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-gray-600">
            내 모든 작업 데이터를 삭제하시겠습니까?
            <br />
            <span className="text-xs text-red-500 font-medium">이 작업은 되돌릴 수 없습니다.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearData(false)}>취소</Button>
            <Button onClick={handleClearData} className="bg-red-600 hover:bg-red-700">삭제</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
