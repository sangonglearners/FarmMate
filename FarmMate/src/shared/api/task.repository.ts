import { BaseRepository } from './base.repository'

export class TaskRepository extends BaseRepository {
  async listByDateRange(from: string, to: string, filter?: { farm_id?: string; crop_id?: string }) {
    const userId = await this.withUserId()
    let q = this.supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('scheduled_date', from)
      .lte('scheduled_date', to)

    if (filter?.farm_id) q = q.eq('farm_id', filter.farm_id)
    if (filter?.crop_id) q = q.eq('crop_id', filter.crop_id)

    const { data, error } = await q.order('scheduled_date', { ascending: true })
    if (error) throw new Error(error.message)
    return data
  }

  async create(input: {
    title: string;
    task_type: string;
    scheduled_date: string;
    description?: string;
    end_date?: string | null;
    farm_id?: string | null;
    crop_id?: string | null;
    row_number?: number | null;
  }) {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('tasks')
      .insert([{ ...input, user_id: userId, completed: 0 }])
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }

  async setCompleted(taskId: string, completed: boolean) {
    const userId = await this.withUserId()
    const { data, error } = await this.supabase
      .from('tasks')
      .update({ completed: completed ? 1 : 0, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data
  }
}


