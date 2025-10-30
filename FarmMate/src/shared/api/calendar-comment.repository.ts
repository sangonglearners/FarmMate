import { BaseRepository } from './base.repository'

type CalendarCommentRow = {
  id: string
  calendar_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  user_profile?: {
    email: string
    display_name?: string
  }
}

export type CalendarCommentEntity = {
  id: string
  calendarId: string
  userId: string
  content: string
  createdAt: string
  updatedAt: string
}

export type CalendarCommentWithUser = CalendarCommentEntity & {
  userEmail: string
  userDisplayName?: string
}

function mapCalendarCommentRowToEntity(row: CalendarCommentRow): CalendarCommentEntity {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    userId: row.user_id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CalendarCommentRepository extends BaseRepository {
  /**
   * 캘린더의 모든 댓글 조회 (사용자 정보 포함)
   */
  async getCommentsByCalendarId(calendarId: string): Promise<CalendarCommentWithUser[]> {
    // 1. 댓글 조회
    const { data: comments, error: commentsError } = await this.supabase
      .from('calendar_comments')
      .select('*')
      .eq('calendar_id', calendarId)
      .order('created_at', { ascending: true })
    
    if (commentsError) throw new Error(commentsError.message)
    if (!comments || comments.length === 0) return []
    
    // 2. 고유한 user_id 수집
    const userIds = [...new Set(comments.map((c: any) => c.user_id))]
    
    // 3. user_profiles 조회
    const { data: profiles, error: profilesError } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', userIds)
    
    if (profilesError) throw new Error(profilesError.message)
    
    // 4. 프로필 맵 생성
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    
    // 5. 댓글과 프로필 결합
    return (comments || []).map((row: any) => {
      const comment = mapCalendarCommentRowToEntity(row as CalendarCommentRow)
      const profile = profileMap.get(row.user_id) || {}
      
      return {
        ...comment,
        userEmail: profile.email || '',
        userDisplayName: profile.display_name || undefined,
      }
    })
  }

  /**
   * 댓글 생성
   */
  async createComment(
    calendarId: string,
    content: string
  ): Promise<CalendarCommentEntity> {
    const userId = await this.withUserId()
    
    const { data, error } = await this.supabase
      .from('calendar_comments')
      .insert({
        calendar_id: calendarId,
        user_id: userId,
        content: content,
      })
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return mapCalendarCommentRowToEntity(data as CalendarCommentRow)
  }

  /**
   * 댓글 수정
   */
  async updateComment(
    commentId: string,
    content: string
  ): Promise<CalendarCommentEntity> {
    const userId = await this.withUserId()
    
    const { data, error } = await this.supabase
      .from('calendar_comments')
      .update({ content })
      .eq('id', commentId)
      .eq('user_id', userId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return mapCalendarCommentRowToEntity(data as CalendarCommentRow)
  }

  /**
   * 댓글 삭제
   */
  async deleteComment(commentId: string): Promise<void> {
    const userId = await this.withUserId()
    
    const { error } = await this.supabase
      .from('calendar_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId)
    
    if (error) throw new Error(error.message)
  }
}

