import { BaseRepository } from './base.repository'

export class CropRepository extends BaseRepository {
  async listByFarm(farmId?: string) {
    const userId = await this.withUserId()
    let q = this.supabase.from('crops').select('*').eq('user_id', userId)
    if (farmId) q = q.eq('farm_id', farmId)
    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }

  async create(input: { name: string; variety: string; category: string; farm_id?: string }) {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('crops')
      .insert([{ ...input, user_id: userId }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }
}


