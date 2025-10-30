import { BaseRepository } from './base.repository'

type CalendarShareRow = {
  id: string
  calendar_id: string
  owner_id: string
  shared_user_id: string
  role: 'editor' | 'commenter' | 'viewer'
  created_at: string | null
  updated_at: string | null
}

export type CalendarShareEntity = {
  id: string
  calendarId: string
  ownerId: string
  sharedUserId: string
  role: 'editor' | 'commenter' | 'viewer'
  createdAt: string | null
  updatedAt: string | null
}

export type SharedUser = {
  shareId: string
  userId: string
  email: string
  displayName?: string
  role: 'editor' | 'commenter' | 'viewer'
}

export type SearchableUser = {
  id: string
  email: string
  displayName?: string
}

export type UserRole = 'owner' | 'editor' | 'commenter' | 'viewer' | null

function mapCalendarShareRowToEntity(row: CalendarShareRow): CalendarShareEntity {
  return {
    id: row.id,
    calendarId: row.calendar_id,
    ownerId: row.owner_id,
    sharedUserId: row.shared_user_id,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CalendarShareRepository extends BaseRepository {
  /**
   * 이메일로 사용자 검색
   */
  async searchUserByEmail(email: string): Promise<SearchableUser[]> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .ilike('email', `%${email}%`)
      .neq('id', userId) // 자기 자신은 제외
      .limit(10)
    
    if (error) throw new Error(error.message)
    
    return (data || []).map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.display_name || undefined,
    }))
  }

  /**
   * 농장 공유 설정 생성 (calendar_id 대신 farm_id 사용)
   */
  async shareFarmWithUser(
    farmId: string,
    userId: string,
    role: 'editor' | 'commenter' | 'viewer'
  ): Promise<CalendarShareEntity> {
    const ownerId = await this.withUserId()
    
    // 중복 체크
    const { data: existing } = await this.supabase
      .from('calendar_shares')
      .select('id')
      .eq('calendar_id', farmId)
      .eq('shared_user_id', userId)
      .single()
    
    if (existing) {
      throw new Error('이미 공유된 사용자입니다.')
    }
    
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .insert({
        calendar_id: farmId, // farm_id를 calendar_id로 사용
        owner_id: ownerId,
        shared_user_id: userId,
        role: role,
      })
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return mapCalendarShareRowToEntity(data as CalendarShareRow)
  }

  /**
   * @deprecated - shareFarmWithUser 사용
   */
  async shareCalendarWithUser(
    calendarId: string,
    userId: string,
    role: 'editor' | 'commenter' | 'viewer'
  ): Promise<CalendarShareEntity> {
    return this.shareFarmWithUser(calendarId, userId, role)
  }

  /**
   * 농장의 소유주 정보 조회
   */
  async getFarmOwner(farmId: string): Promise<SharedUser | null> {
    // 농장 정보 조회하여 소유주 찾기
    const { data: farm, error: farmError } = await this.supabase
      .from('farms')
      .select('user_id')
      .eq('id', farmId)
      .single()
    
    if (farmError || !farm) return null
    
    // 소유주 프로필 조회
    const { data: profile, error: profileError } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .eq('id', farm.user_id)
      .single()
    
    if (profileError || !profile) return null
    
    return {
      shareId: '', // 소유주는 shareId 없음
      userId: profile.id,
      email: profile.email || '',
      displayName: profile.display_name || undefined,
      role: 'owner' as any, // 소유주 표시용
    }
  }

  /**
   * 여러 농장이 공유되고 있는지 확인 (배치 조회)
   */
  async getSharedFarmIds(farmIds: string[]): Promise<Set<string>> {
    if (farmIds.length === 0) return new Set()
    
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .select('calendar_id')
      .in('calendar_id', farmIds)
    
    if (error) {
      console.warn('공유 농장 조회 실패:', error)
      return new Set()
    }
    
    return new Set((data || []).map((row: any) => row.calendar_id.toString()))
  }

  /**
   * 여러 농장의 소유주 정보 조회 (배치 조회)
   */
  async getFarmOwners(farmIds: string[]): Promise<Map<string, SharedUser>> {
    if (farmIds.length === 0) return new Map()
    
    // 농장 정보 조회
    const { data: farms, error: farmsError } = await this.supabase
      .from('farms')
      .select('id, user_id')
      .in('id', farmIds)
    
    if (farmsError || !farms || farms.length === 0) return new Map()
    
    // 소유주 ID 수집
    const ownerIds = [...new Set(farms.map((f: any) => f.user_id))]
    
    // 소유주 프로필 조회
    const { data: profiles, error: profilesError } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', ownerIds)
    
    if (profilesError) {
      console.warn('프로필 조회 실패:', profilesError)
      return new Map()
    }
    
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    const ownerMap = new Map<string, SharedUser>()
    
    farms.forEach((farm: any) => {
      const profile = profileMap.get(farm.user_id)
      if (profile) {
        ownerMap.set(farm.id, {
          shareId: '',
          userId: profile.id,
          email: profile.email || '',
          displayName: profile.display_name || undefined,
          role: 'owner' as any,
        })
      }
    })
    
    return ownerMap
  }

  /**
   * 농장의 공유된 사용자 목록 조회
   */
  async getSharedUsers(farmId: string): Promise<SharedUser[]> {
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .select('id, role, shared_user_id')
      .eq('calendar_id', farmId)
    
    if (error) throw new Error(error.message)
    
    // user_profiles를 별도로 조회
    const userIds = (data || []).map((row: any) => row.shared_user_id)
    if (userIds.length === 0) return []
    
    const { data: profiles, error: profilesError } = await this.supabase
      .from('user_profiles')
      .select('id, email, display_name')
      .in('id', userIds)
    
    if (profilesError) {
      console.warn('프로필 조회 실패:', profilesError)
    }
    
    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
    
    return (data || []).map((row: any) => ({
      shareId: row.id,
      userId: row.shared_user_id,
      email: profileMap.get(row.shared_user_id)?.email || '',
      displayName: profileMap.get(row.shared_user_id)?.display_name || undefined,
      role: row.role,
    }))
  }

  /**
   * 사용자 권한 업데이트
   */
  async updateUserPermission(
    shareId: string,
    role: 'editor' | 'commenter' | 'viewer'
  ): Promise<CalendarShareEntity> {
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', shareId)
      .select()
      .single()
    
    if (error) throw new Error(error.message)
    return mapCalendarShareRowToEntity(data as CalendarShareRow)
  }

  /**
   * 공유 제거
   */
  async removeSharedUser(shareId: string): Promise<void> {
    const { error } = await this.supabase
      .from('calendar_shares')
      .delete()
      .eq('id', shareId)
    
    if (error) throw new Error(error.message)
  }

  /**
   * 현재 사용자의 특정 캘린더에 대한 권한 조회
   */
  async getUserRoleForCalendar(calendarId: string): Promise<UserRole> {
    const userId = await this.withUserId()
    // 먼저 소유자인지 확인: farms.user_id 기준
    const { data: farm, error: farmError } = await this.supabase
      .from('farms')
      .select('user_id')
      .eq('id', calendarId)
      .single()
    if (!farmError && farm && farm.user_id === userId) {
      return 'owner'
    }

    // 공유받은 사용자인지 확인
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .select('role')
      .eq('calendar_id', calendarId)
      .eq('shared_user_id', userId)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data.role as UserRole
  }

  /**
   * 모든 공유받은 캘린더 목록 조회
   */
  async getSharedCalendars(): Promise<Array<{ calendarId: string; role: UserRole }>> {
    const userId = await this.withUserId()
    
    const { data, error } = await this.supabase
      .from('calendar_shares')
      .select('calendar_id, role')
      .eq('shared_user_id', userId)
    
    if (error) throw new Error(error.message)
    
    return (data || []).map((row) => ({
      calendarId: row.calendar_id,
      role: row.role as UserRole,
    }))
  }
}

