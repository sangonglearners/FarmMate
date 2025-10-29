// Calendar share management API functions
import { CalendarShareRepository } from "@/shared/api/calendar-share.repository";
import type { SharedUser, SearchableUser, UserRole } from "@/shared/api/calendar-share.repository";

export const calendarShareApi = {
  searchUserByEmail: async (email: string): Promise<SearchableUser[]> => {
    const repo = new CalendarShareRepository();
    return repo.searchUserByEmail(email);
  },

  shareCalendarWithUser: async (
    farmId: string,
    userId: string,
    role: 'editor' | 'commenter' | 'viewer'
  ): Promise<void> => {
    const repo = new CalendarShareRepository();
    await repo.shareFarmWithUser(farmId, userId, role);
  },

  getSharedUsers: async (farmId: string): Promise<SharedUser[]> => {
    const repo = new CalendarShareRepository();
    return repo.getSharedUsers(farmId);
  },

  updateUserPermission: async (
    shareId: string,
    role: 'editor' | 'commenter' | 'viewer'
  ): Promise<void> => {
    const repo = new CalendarShareRepository();
    await repo.updateUserPermission(shareId, role);
  },

  removeSharedUser: async (shareId: string): Promise<void> => {
    const repo = new CalendarShareRepository();
    await repo.removeSharedUser(shareId);
  },

  getUserRoleForCalendar: async (calendarId: string): Promise<UserRole> => {
    const repo = new CalendarShareRepository();
    return repo.getUserRoleForCalendar(calendarId);
  },

  getSharedCalendars: async (): Promise<Array<{ calendarId: string; role: UserRole }>> => {
    const repo = new CalendarShareRepository();
    return repo.getSharedCalendars();
  },

  getFarmOwner: async (farmId: string): Promise<SharedUser | null> => {
    const repo = new CalendarShareRepository();
    return repo.getFarmOwner(farmId);
  },
};
