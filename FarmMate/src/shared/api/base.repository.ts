import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient, requireUser } from '@/lib/supabaseClient'

export abstract class BaseRepository {
  protected supabase: SupabaseClient

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? getSupabaseClient()
  }

  protected async withUserId() {
    const user = await requireUser()
    return user.id
  }
}


