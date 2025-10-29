import { BaseRepository } from './base.repository'

type CropRow = {
  id: string
  user_id: string
  farm_id: string | null
  category: string
  name: string
  variety: string
  status: string | null
  created_at: string | null
}

export type CropEntity = {
  id: string
  userId: string
  farmId: string | null
  category: string
  name: string
  variety: string
  status: string | null
  createdAt: string | null
}

function mapCropRowToEntity(row: CropRow): CropEntity {
  return {
    id: row.id,
    userId: row.user_id,
    farmId: row.farm_id,
    category: row.category,
    name: row.name,
    variety: row.variety,
    status: row.status ?? null,
    createdAt: row.created_at ?? null,
  }
}

export class CropRepository extends BaseRepository {
  async listByFarm(farmId?: string): Promise<CropEntity[]> {
    const userId = await this.withUserId()
    // RLS 정책이 자동으로 처리하므로 user_id 필터링 제거
    // RLS 정책에 따라 본인의 작물과 공유받은 농장의 작물이 모두 반환됨
    let q = this.supabase.from('crops').select('*')
    if (farmId) q = q.eq('farm_id', farmId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data as CropRow[]).map(mapCropRowToEntity)
  }

  async create(input: { name: string; variety: string; category: string; farm_id?: string }): Promise<CropEntity> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('crops')
      .insert([{ ...input, user_id: userId }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapCropRowToEntity(data as CropRow)
  }

  async update(
    cropId: string,
    input: Partial<{ name: string; variety: string; category: string; farm_id?: string; status?: string }>
  ): Promise<CropEntity> {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('crops')
      .update(input)
      .eq('id', cropId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return mapCropRowToEntity(data as CropRow)
  }

  async remove(cropId: string) {
    const userId = await this.withUserId()
    const { error } = await this.supabase
      .from('crops')
      .delete()
      .eq('id', cropId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}


