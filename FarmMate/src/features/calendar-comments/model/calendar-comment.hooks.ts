// Calendar comment management hooks
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { calendarCommentApi } from "../api/calendar-comment.api";
import type { CalendarCommentWithUser } from "@/shared/api/calendar-comment.repository";

export const useCalendarComments = (calendarId: string) => {
  return useQuery<CalendarCommentWithUser[]>({
    queryKey: ["/api/calendar-comments", calendarId],
    queryFn: () => calendarCommentApi.getCommentsByCalendarId(calendarId),
    enabled: !!calendarId,
  });
};

export const useCreateCalendarComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ calendarId, content }: { calendarId: string; content: string }) =>
      calendarCommentApi.createComment(calendarId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-comments", variables.calendarId] });
      toast({
        title: "댓글 작성 완료",
        description: "댓글이 성공적으로 작성되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Create comment error:", error);
      toast({
        title: "댓글 작성 실패",
        description: "댓글 작성 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useUpdateCalendarComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      calendarCommentApi.updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-comments"] });
      toast({
        title: "댓글 수정 완료",
        description: "댓글이 성공적으로 수정되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Update comment error:", error);
      toast({
        title: "댓글 수정 실패",
        description: "댓글 수정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

export const useDeleteCalendarComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (commentId: string) => calendarCommentApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-comments"] });
      toast({
        title: "댓글 삭제 완료",
        description: "댓글이 성공적으로 삭제되었습니다.",
      });
    },
    onError: (error) => {
      console.error("Delete comment error:", error);
      toast({
        title: "댓글 삭제 실패",
        description: "댓글 삭제 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });
};

