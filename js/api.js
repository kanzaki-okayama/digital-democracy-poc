export function setupSupabase() {
  const SUPABASE_URL = "https://eispzocmbopasgcvgxmi.supabase.co";            // 例: https://xxxx.supabase.co
  const SUPABASE_ANON_KEY = "sb_publishable_aquwjbBqrCVeZ1dSGW4Jow_ayZE7ZUU";  // Settings → API → anon public key
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export async function fetchPosts(supabase) {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  return data || [];
}

export async function submitPost(supabase, post) {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ▼ 追加：返信関連 ▼ */
export async function fetchReplies(supabase, postId) {
  const { data, error } = await supabase
    .from('replies')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  if (error) console.error(error);
  return data || [];
}

export async function submitReply(supabase, reply) {
  const { data, error } = await supabase
    .from('replies')
    .insert(reply)
    .select()
    .single();
  if (error) throw error;
  return data;
}
