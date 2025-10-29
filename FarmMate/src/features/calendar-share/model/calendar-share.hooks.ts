// Calendar share management hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { calendarShareApi } from "../api/calendar-share.api";
import type { SharedUser, SearchableUser, UserRole } from "@/shared/api/calendar-share.repository";

export const useSearchUserByEmail = () => {
  return useMutation({
    mutationFn: (email: string) => calendarShareApi.searchUserByEmail(email),
  });
};

export const useShareCalendarWithUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ farmId, userId, role }: { farmId: string; userId: string; role: 'editor' | 'commenter' | 'viewer' }) =>
      calendarShareApi.shareCalendarWithUser(farmId, userId, role),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares", variables.farmId] });
      toast({
        title: "공유 완료",
        description: "캘린더가 성공적으로 공유되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Calendar share error:", error);
      toast({
        title: "공유 실패",
        description: "캘린더 공유 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useSharedUsers = (farmId: string) => {
  return useQuery<SharedUser[]>({
    queryKey: ["/api/calendar-shares", farmId],
    queryFn: () => calendarShareApi.getSharedUsers(farmId),
    enabled: !!farmId,
  });
};

export const useUpdateUserPermission = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ shareId, role }: { shareId: string; role: 'editor' | 'commenter' | 'viewer' }) =>
      calendarShareApi.updateUserPermission(shareId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares"] });
      toast({
        title: "권한 변경 완료",
        description: "사용자 권한이 성공적으로 변경되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Permission update error:", error);
      toast({
        title: "권한 변경 실패",
        description: "권한 변경 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useRemoveSharedUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (shareId: string) => calendarShareApi.removeSharedUser(shareId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-shares"] });
      toast({
        title: "공유 해제 완료",
        description: "사용자 공유가 성공적으로 해제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Remove shared user error:", error);
      toast({
        title: "공유 해제 실패",
        description: "공유 해제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useUserRoleForCalendar = (calendarId: string) => {
  return useQuery<UserRole>({
    queryKey: ["/api/user-role", calendarId],
    queryFn: () => calendarShareApi.getUserRoleForCalendar(calendarId),
    enabled: !!calendarId,
  });
};

export const useSharedCalendars = () => {
  return useQuery<Array<{ calendarId: string; role: UserRole }>>({
    queryKey: ["/api/shared-calendars"],
    queryFn: () => calendarShareApi.getSharedCalendars(),
  });
};

export const useFarmOwner = (farmId: string) => {
  return useQuery<SharedUser | null>({
    queryKey: ["/api/farm-owner", farmId],
    queryFn: () => calendarShareApi.getFarmOwner(farmId),
    enabled: !!farmId,
  });
};

