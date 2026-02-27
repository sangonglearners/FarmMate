import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MoreVertical, Edit, Trash2, MapPin, Sprout, BookOpen } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Camera } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Input } from '@/components/ui/input';
import { useFarms, useDeleteFarm } from '@features/farm-management';
import { useCrops, useDeleteCrop } from '@features/crop-management';
import { AddFarmDialog } from '@features/farm-management';
import { AddCropDialog } from '@features/crop-management';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { clearCurrentUserTaskData, clearAllFrontendData } from '../../../shared/api/clearAllData';
import { Separator } from '@/components/ui/separator';
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
  
  const { data: allFarms } = useFarms();
  // 내 농장만 필터링
  const farms = allFarms?.filter(farm => farm.userId === user?.id) || [];
  const deleteFarm = useDeleteFarm();
  const { data: crops } = useCrops();
  const deleteCrop = useDeleteCrop();
  const [isAddFarmDialogOpen, setIsAddFarmDialogOpen] = useState(false);
  const [isAddCropDialogOpen, setIsAddCropDialogOpen] = useState(false);
  const [editingFarm, setEditingFarm] = useState<any | null>(null);
  const [editingCrop, setEditingCrop] = useState<any | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: "", description: "", onConfirm: () => {} });

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

      {/* 장부 관리 버튼 */}
      <Card>
        <CardContent className="p-4">
          <Link href="/ledger-management">
            <Button variant="outline" className="w-full justify-start h-14">
              <BookOpen className="w-5 h-5 mr-3" />
              <div className="flex flex-col items-start">
                <span className="font-medium">장부 관리</span>
                <span className="text-xs text-gray-500">매출 및 비용 내역을 관리합니다</span>
              </div>
            </Button>
          </Link>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end -mt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2" aria-label="settings">
              <Settings className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => setShowClearData(true)}>DB 데이터 삭제</DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              clearAllFrontendData();
              queryClient.clear();
              alert('프론트엔드 데이터가 모두 삭제되었습니다.');
            }}>프론트 데이터 삭제</DropdownMenuItem>
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
        <div className="flex-1 flex gap-2">
          <Input value={tempUserName} onChange={(e) => handleNameChange(e.target.value)} />
          <Button onClick={handleSaveName} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><MapPin className="w-5 h-5 text-gray-600" /> 내 농장 정보</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddFarmDialogOpen(true)}>추가</Button>
        </div>
        {farms && farms.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {farms.map((f) => (
              <Card key={f.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-900">{f.name}</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {f.environment} | {f.area}㎡ | 이랑 {f.rowCount}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingFarm(f); setIsAddFarmDialogOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: `"${f.name}" 농장을 삭제하시겠습니까?`,
                              description: "이 농장에 연결된 모든 작물과 작업도 함께 삭제됩니다.",
                              onConfirm: () => deleteFarm.mutate(f.id),
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">등록된 농장이 없습니다</div>
            </CardContent>
          </Card>
        )}
      </section>

      <Separator className="my-2" />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Sprout className="w-5 h-5 text-gray-600" /> 내 작물 정보</h2>
          <Button variant="ghost" size="sm" onClick={() => setIsAddCropDialogOpen(true)}>수정</Button>
        </div>
        {crops && crops.length > 0 ? (
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {crops.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {c.category} {'>'} {c.name} {'>'} {c.variety}
                      </h3>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingCrop(c); setIsAddCropDialogOpen(true); }}>
                          <Edit className="w-4 h-4 mr-2" /> 수정
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive" 
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              title: `"${c.name}" 작물을 삭제하시겠습니까?`,
                              description: "이 작물에 연결된 모든 작업도 함께 삭제됩니다.",
                              onConfirm: () => deleteCrop.mutate(c.id),
                            });
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">등록된 작물이 없습니다</div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Inline add/edit dialogs */}
      <AddFarmDialog 
        open={isAddFarmDialogOpen} 
        onOpenChange={(open) => {
          setIsAddFarmDialogOpen(open);
          if (!open) {
            setEditingFarm(null);
            queryClient.invalidateQueries({ queryKey: ["/api/farms"] });
          }
        }} 
        farm={editingFarm}
      />
      <AddCropDialog 
        open={isAddCropDialogOpen} 
        onOpenChange={(open) => {
          setIsAddCropDialogOpen(open);
          if (!open) {
            setEditingCrop(null);
            queryClient.invalidateQueries({ queryKey: ["/api/crops"] });
          }
        }} 
        crop={editingCrop}
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
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="삭제"
        cancelText="취소"
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}


