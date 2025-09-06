import { useEffect, useState } from 'react';
import { Button } from '@shared/ui/button';
import { Card, CardContent } from '@shared/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@shared/ui/dialog';
import { Settings, Camera } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Input } from '@shared/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@shared/ui/dropdown-menu';
import { useFarms } from '@features/farm-management';
import { useCrops } from '@features/crop-management';
import { AddFarmDialog } from '@features/farm-management';
import { AddCropDialog } from '@features/crop-management';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';

export default function MyPage() {
  const [showLogout, setShowLogout] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [userName, setUserName] = useState<string>('사용자');
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [, setLocation] = useLocation();
  const { data: farms } = useFarms();
  const { data: crops } = useCrops();
  const [isAddFarmDialogOpen, setIsAddFarmDialogOpen] = useState(false);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { signOut, user } = useAuth();

  useEffect(() => {
    // 실제 사용자 정보 우선, 없으면 로컬 스토리지에서 가져오기
    if (user) {
      setUserName(user.user_metadata?.full_name || user.email || '사용자');
      if (user.user_metadata?.avatar_url) {
        setAvatarUrl(user.user_metadata.avatar_url);
      }
    } else {
      const savedName = localStorage.getItem('fm_user_name');
      const savedAvatar = localStorage.getItem('fm_user_avatar');
      if (savedName) setUserName(savedName);
      if (savedAvatar) setAvatarUrl(savedAvatar);
    }
  }, [user]);

  const handleNameChange = (value: string) => {
    setUserName(value);
    localStorage.setItem('fm_user_name', value);
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
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setShowLogout(true)}>로그아웃</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWithdraw(true)}>회원탈퇴</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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
        <div className="flex-1">
          <Input value={userName} onChange={(e) => handleNameChange(e.target.value)} />
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">내 농장 정보</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddFarmDialogOpen(true)}>수정</Button>
        </div>
        <Card>
          <CardContent className="p-4">
            {farms && farms.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm">
                {farms.map((f) => (
                  <li key={f.id}>
                    {f.name} / {f.rowCount}이랑 / {f.area}m^2
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">등록된 농장이 없습니다</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">내 작물 정보</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddCropDialogOpen(true)}>수정</Button>
        </div>
        <Card>
          <CardContent className="p-4">
            {crops && crops.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-sm">
                {crops.map((c) => (
                  <li key={c.id}>
                    {c.category} {'>'} {c.name} {'>'} {c.variety}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">등록된 작물이 없습니다</div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Inline add/edit dialogs */}
      <AddFarmDialog 
        open={isAddFarmDialogOpen} 
        onOpenChange={(open) => {
          setIsAddFarmDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
          }
        }} 
      />
      <AddCropDialog 
        open={isAddCropDialogOpen} 
        onOpenChange={(open) => {
          setIsAddCropDialogOpen(open);
          if (!open) {
            queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
          }
        }} 
      />

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
    </div>
  );
}


