import { getCategoryColor, escapeHtml } from './map.js';



export async function initSidebar(supabase, posts, map) {
  console.log("✅ initSidebar 起動");

  // 既存のsidebarがあれば削除（SPA対応）
  const existing = document.getElementById('sidebar');
  if (existing) existing.remove();

  // --- サイドバー生成 ---
  const sidebar = document.createElement('div');
  sidebar.id = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div style="font-weight:bold; font-size:14px;">意見一覧</div>
      
      <div style="margin-top:6px;">
        <select id="category-filter">
          <option value="all">すべてのカテゴリ</option>
          <option value="地域経済">地域経済</option>
          <option value="交通・道路">交通・道路</option>
          <option value="子育て・教育・高齢者福祉">子育て・教育・高齢者福祉</option>
          <option value="若者支援・雇用">若者支援・雇用</option>
          <option value="医療・健康">医療・健康</option>
          <option value="自然・環境">自然・環境</option>
          <option value="防災・安全">防災・安全</option>
          <option value="行政・政治改革">行政・政治改革</option>
          <option value="その他">その他</option>
        </select>
      </div>

      <div style="margin-top:6px;">
        <select id="sort-select">
          <option value="newest">新しい順</option>
          <option value="likes">賛同が多い順</option>
          <option value="comments">コメントが多い順</option>
        </select>
      </div>
    </div>

    <div id="post-list" style="margin-top:8px;"></div>
  `;
  document.body.appendChild(sidebar);

  const postList = sidebar.querySelector('#post-list');
  const sortSelect = sidebar.querySelector('#sort-select');
  const categoryFilter = sidebar.querySelector('#category-filter');

  // ✅ ここで最新の投稿データを都度取得（古いキャッシュ対策）
  const { data: freshPosts, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('⚠️ 投稿取得エラー:', error);
  } else {
    posts = freshPosts;
  }

  // --- 投稿リスト描画関数 ---
  function renderPostList(list) {
    postList.innerHTML = '';
    if (!list || list.length === 0) {
      postList.innerHTML = `<p style="color:#777; text-align:center;">投稿がありません</p>`;
      return;
    }

    list.forEach(post => {
      const color = getCategoryColor(post.category);
      const item = document.createElement('div');
      item.className = 'post-item';
      item.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 1px solid #ddd;
        padding: 8px 4px;
        cursor: pointer;
      `;

      const left = document.createElement('div');
      left.style.flex = '1';
      left.innerHTML = `
        <div style="display:flex; align-items:center; font-size:12px; font-weight:bold; margin-bottom:2px;">
          <div style="width:10px; height:10px; border-radius:50%; background:${color}; margin-right:6px;"></div>
          ${escapeHtml(post.category || '未分類')}
        </div>
        <div style="font-size:12px; color:#333; line-height:1.3;">
          ${escapeHtml(post.content.slice(0, 80))}${post.content.length > 80 ? '…' : ''}
        </div>
      `;

      const right = document.createElement('div');
      right.style.cssText = `text-align:right; font-size:11px; color:#666; line-height:1.3; min-width:50px;`;
      right.innerHTML = `<div>❤️ ${post.likes || 0}</div><div>💬 ${post.comments_count || 0}</div>`;

      item.appendChild(left);
      item.appendChild(right);

      // マップ上で該当ピンにズーム＆ポップアップ
      item.addEventListener('click', () => {
        map.setView([post.lat, post.lng], 15);
        map.eachLayer(layer => {
          if (layer.getLatLng && layer.getLatLng().lat === post.lat && layer.getLatLng().lng === post.lng) {
            layer.openPopup();
          }
        });
      });

      postList.appendChild(item);
    });
  }

  // --- フィルター＆ソート処理 ---
  function applyFilterAndSort() {
    let filtered = [...posts];
    const category = categoryFilter.value;
    const sortVal = sortSelect.value;

    if (category !== 'all') filtered = filtered.filter(p => p.category === category);

    if (sortVal === 'likes') filtered.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    else if (sortVal === 'comments') filtered.sort((a, b) => (b.comments_count || 0) - (a.comments_count || 0));
    else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    renderPostList(filtered);
  }

  sortSelect.addEventListener('change', applyFilterAndSort);
  categoryFilter.addEventListener('change', applyFilterAndSort);

  // --- 初期表示 ---
  applyFilterAndSort();
  console.log("✅ サイドバー初期化完了");

  // --- Realtime購読（重複防止） ---
  const channelName = 'posts-changes';
  const existingChannel = supabase.getChannels().find(c => c.topic === channelName);
  if (existingChannel) {
    supabase.removeChannel(existingChannel);
  }

  const channel = supabase
    .channel(channelName)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        posts = data;
        applyFilterAndSort();
      }
    })
    .subscribe();

  // ✅ この関数を返せば、main.js 側で cleanupSidebar() として呼べる
  return () => {
    supabase.removeChannel(channel);
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.remove();
    console.log('🧹 サイドバー購読解除完了');
  };
}

