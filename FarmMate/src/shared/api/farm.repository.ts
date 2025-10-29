import { BaseRepository } from './base.repository'

type FarmRow = {
  id: string
  user_id: string
  name: string
  environment: string
  row_count: number
  area: number
  created_at: string | null
}

export type FarmEntity = {
  id: string
  userId: string
  name: string
  environment: string
  rowCount: number
  area: number
  createdAt: string | null
}

function mapFarmRowToEntity(row: FarmRow): FarmEntity {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    environment: row.environment,
    rowCount: row.row_count,
    area: row.area,
    createdAt: row.created_at,
  }
}

export class FarmRepository extends BaseRepository {
  async list(): Promise<FarmEntity[]> {
    const userId = await this.withUserId()
    // RLS가 자동으로 처리하므로 단순히 select만 하면 됨
    // RLS 정책에 따라 본인의 농장과 공유받은 농장이 모두 반환됨
    const { data, error } = await this.supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as FarmRow[]).map(mapFarmRowToEntity)
  }

  async listOwn(): Promise<FarmEntity[]> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as FarmRow[]).map(mapFarmRowToEntity)
  }

  async listShared(): Promise<FarmEntity[]> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('farms')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    
    // 공유받은 농장만 필터링
    const { data: sharedCalendars } = await this.supabase
      .from('calendar_shares')
      .select('calendar_id')
      .eq('shared_user_id', userId)
    
    const sharedFarmIds = new Set(
      (sharedCalendars || []).map((cs: any) => cs.calendar_id.toString())
    )
    
    const allFarms = (data as FarmRow[]).map(mapFarmRowToEntity)
    return allFarms.filter((farm) => sharedFarmIds.has(farm.id))
  }

  async create(input: { name: string; environment: string; rowCount: number; area: number }): Promise<FarmEntity> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('farms')
      .insert([{ name: input.name, environment: input.environment, row_count: input.rowCount, area: input.area, user_id: userId }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapFarmRowToEntity(data as FarmRow)
  }

  async update(farmId: string, input: Partial<{ name: string; environment: string; rowCount: number; area: number }>): Promise<FarmEntity> {
    const userId = await this.withUserId()
    const payload: Partial<FarmRow> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.environment !== undefined) payload.environment = input.environment
    if (input.rowCount !== undefined) payload.row_count = input.rowCount
    if (input.area !== undefined) payload.area = input.area

    const { data, error } = await this.supabase
      .from('farms')
      .update(payload)
      .eq('id', farmId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapFarmRowToEntity(data as FarmRow)
  }

  async remove(farmId: string): Promise<void> {
    const userId = await this.withUserId()
    const { error } = await this.supabase
      .from('farms')
      .delete()
      .eq('id', farmId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}


