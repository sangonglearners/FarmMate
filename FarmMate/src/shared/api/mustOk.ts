import type { PostgrestSingleResponse } from "@supabase/supabase-js";
export function mustOk<T>(res: PostgrestSingleResponse<T>) {
  if (res.error) throw res.error;
  return res.data!;
}
