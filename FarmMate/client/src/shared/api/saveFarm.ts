// client/src/shared/api/saveFarm.ts
import { supabase } from "./supabase";
import { mustOk } from "./mustOk";

export async function saveFarm(input: { name: string; environment?: string; rowCount?: number; area?: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const res = await supabase
    .from("farms")
    .insert({
      owner_id: user.id,
      name: input.name,
      environment: input.environment ?? null,
      row_count: input.rowCount ?? null,
      area: input.area ?? null,
    })
    .select()
    .single();

  return mustOk(res);
}
