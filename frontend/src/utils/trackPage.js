import { supabase } from './supabase';

export async function trackPage(userId, page, metadata = null) {
  if (!userId) return;
  await supabase.from('page_views').insert({ user_id: userId, page, metadata }).then(() => {});
}
