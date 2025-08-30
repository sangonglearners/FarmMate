import { supabase } from "./supabase";
import { mustOk } from "./mustOk";

export async function saveCrop(input: {
  name: string; category?: string; variety?: string; farmId?: number; sowingDate?: string
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요합니다.");

  const res = await supabase
    .from("crops")
    .insert({
      owner_id: user.id,
      name: input.name,
      category: input.category ?? null,
      variety: input.variety ?? null,
      farm_id: input.farmId ?? null,
      sowing_date: input.sowingDate ?? null,
    })
    .select()
    .single();

  return mustOk(res);
}
