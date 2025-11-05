// Calendar comment management API functions
import { CalendarCommentRepository } from "@/shared/api/calendar-comment.repository";
import type { CalendarCommentWithUser, CalendarCommentEntity } from "@/shared/api/calendar-comment.repository";

export const calendarCommentApi = {
  getCommentsByCalendarId: async (calendarId: string): Promise<CalendarCommentWithUser[]> => {
    const repo = new CalendarCommentRepository();
    return repo.getCommentsByCalendarId(calendarId);
  },

  createComment: async (
    calendarId: string,
    content: string
  ): Promise<CalendarCommentEntity> => {
    const repo = new CalendarCommentRepository();
    return repo.createComment(calendarId, content);
  },

  updateComment: async (
    commentId: string,
    content: string
  ): Promise<CalendarCommentEntity> => {
    const repo = new CalendarCommentRepository();
    return repo.updateComment(commentId, content);
  },

  deleteComment: async (commentId: string): Promise<void> => {
    const repo = new CalendarCommentRepository();
    await repo.deleteComment(commentId);
  },
};

