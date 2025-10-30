import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchUserByEmail, useShareCalendarWithUser, useSharedUsers, useUpdateUserPermission, useRemoveSharedUser, useUserRoleForCalendar } from "../model";
import type { SharedUser, SearchableUser } from "@/shared/api/calendar-share.repository";
import { X, Search, Loader2, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface CalendarShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  farmId: string;
}

export default function CalendarShareDialog({ open, onOpenChange, farmId }: CalendarShareDialogProps) {
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedUser, setSelectedUser] = useState<SearchableUser | null>(null);
  const [role, setRole] = useState<'editor' | 'commenter' | 'viewer'>('viewer');
  const [showSearchResults, setShowSearchResults] = useState(false);

  const { data: sharedUsers = [], isLoading: sharedUsersLoading, refetch } = useSharedUsers(farmId);
  const { data: userRole } = useUserRoleForCalendar(farmId);
  const canManagePermissions = userRole === 'owner' || userRole === 'editor';
  const searchUserMutation = useSearchUserByEmail();
  const shareMutation = useShareCalendarWithUser();
  const updatePermissionMutation = useUpdateUserPermission();
  const removeUserMutation = useRemoveSharedUser();

  const handleSearch = async () => {
    if (!searchEmail.trim()) return;

    try {
      const results = await searchUserMutation.mutateAsync(searchEmail);
      if (results.length > 0) {
        setSelectedUser(results[0]);
        setShowSearchResults(true);
      } else {
        // 사용자를 찾지 못한 경우
        setShowSearchResults(true);
        setSelectedUser(null);
      }
    } catch (error) {
      console.error("User search error:", error);
    }
  };

  const handleInvite = async () => {
    if (!canManagePermissions) return;
    if (!selectedUser) return;

    try {
      await shareMutation.mutateAsync({
        farmId,
        userId: selectedUser.id,
        role,
      });
      setSearchEmail("");
      setSelectedUser(null);
      setShowSearchResults(false);
      setRole('viewer');
      refetch();
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handleRoleChange = async (shareId: string, newRole: 'editor' | 'commenter' | 'viewer') => {
    if (!canManagePermissions) return;
    try {
      await updatePermissionMutation.mutateAsync({ shareId, role: newRole });
      refetch();
    } catch (error) {
      console.error("Role update error:", error);
    }
  };

  const handleRemove = async (shareId: string) => {
    if (!canManagePermissions) return;
    try {
      await removeUserMutation.mutateAsync(shareId);
      refetch();
    } catch (error) {
      console.error("Remove error:", error);
    }
  };

  const getRoleLabel = (role: 'editor' | 'commenter' | 'viewer') => {
    switch (role) {
      case 'editor':
        return '전체 허용';
      case 'commenter':
        return '댓글 허용 (준비 중)';
      case 'viewer':
        return '읽기 허용';
      default:
        return role;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>공유 설정</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 사용자 초대 영역 */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">캘린더를 다른 사람과 공유하세요</p>
                <div className="flex gap-2">
              <Input
                placeholder="이메일 입력"
                value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    disabled={!canManagePermissions}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
              />
              <Button 
                onClick={handleSearch}
                    disabled={!canManagePermissions || searchUserMutation.isPending || !searchEmail.trim()}
                size="icon"
              >
                {searchUserMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* 검색 결과 */}
            {showSearchResults && selectedUser && (
              <div className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{selectedUser.email.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{selectedUser.email}</p>
                      {selectedUser.displayName && (
                        <p className="text-xs text-gray-500">{selectedUser.displayName}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Select value={role} onValueChange={(value) => setRole(value as 'editor' | 'commenter' | 'viewer')} disabled={!canManagePermissions}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">전체 허용</SelectItem>
                      <SelectItem value="commenter" disabled>댓글 허용 (준비 중)</SelectItem>
                      <SelectItem value="viewer">읽기 허용</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleInvite} 
                    className="w-full"
                    disabled={!canManagePermissions || shareMutation.isPending}
                  >
                    {shareMutation.isPending ? "초대 중..." : "초대"}
                  </Button>
                </div>
              </div>
            )}

            {showSearchResults && !selectedUser && searchUserMutation.isSuccess && (
              <div className="border rounded-lg p-3 bg-yellow-50">
                <p className="text-sm text-yellow-800">사용자를 찾을 수 없습니다.</p>
              </div>
            )}
          </div>

          {/* 공유된 사용자 리스트 */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">공유된 사용자</h3>
            {sharedUsersLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {/* 공유된 사용자들 (소유주 포함) */}
                {sharedUsers.length === 0 ? (
                  <div className="border rounded-lg p-8 text-center text-sm text-gray-500">
                    공유된 사용자가 없습니다.
                  </div>
                ) : (
                  sharedUsers.map((user: SharedUser) => (
                    <div key={user.shareId || user.userId} className="border rounded-lg p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Avatar>
                          <AvatarFallback>{user.email.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.email}</p>
                          {user.displayName && (
                            <p className="text-xs text-gray-500 truncate">{user.displayName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {user.role === 'owner' ? (
                          <Badge variant="outline" className="w-[140px] justify-center bg-amber-50 text-amber-700 border-amber-300">
                            소유주
                          </Badge>
                        ) : (
                          <>
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(user.shareId, value as 'editor' | 'commenter' | 'viewer')}
                              disabled={!canManagePermissions}
                            >
                              <SelectTrigger className="w-[140px]" disabled={!canManagePermissions}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="editor">전체 허용</SelectItem>
                                <SelectItem value="commenter">댓글 허용</SelectItem>
                                <SelectItem value="viewer">읽기 허용</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(user.shareId)}
                              disabled={!canManagePermissions || removeUserMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

