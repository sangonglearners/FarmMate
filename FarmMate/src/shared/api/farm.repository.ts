import { BaseRepository } from './base.repository'

export class FarmRepository extends BaseRepository {
  async list() {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return data
  }

  async create(input: { name: string; environment: string; row_count: number; area: number }) {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('farms')
      .insert([{ ...input, user_id: userId }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async remove(farmId: string) {
    const userId = await this.withUserId()
    const { error } = await this.supabase
      .from('farms')
      .delete()
      .eq('id', farmId)
      .eq('user_id', userId)
    if (error) throw new Error(error.message)
  }
}


