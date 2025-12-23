import { getCategoryColor, escapeHtml } from './map.js';



export async function initSidebar(supabase, posts, map) {
  console.log("✅ initSidebar 起動");

  // --- サイドバー取得/生成 ---
  let sidebar = document.getElementById('sidebar');
  if (!sidebar) {
    sidebar = document.createElement('div');
    sidebar.id = 'sidebar';
    document.body.appendChild(sidebar);
  }

  sidebar.innerHTML = `
    <div class="mobile-handle"></div>
    <div class="sidebar-header">
      <div class="title">意見一覧</div>
      
      <div style="display: flex; flex-direction: column; gap: 8px;">
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

        <select id="sort-select">
          <option value="newest">新しい順</option>
          <option value="likes">賛同が多い順</option>
          <option value="comments">コメントが多い順</option>
        </select>
      </div>
    </div>

    <div id="post-list" class="post-list"></div>
  `;

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
    postList.className = 'post-list';

    if (!list || list.length === 0) {
      postList.innerHTML = `<p style="color:var(--secondary); text-align:center; padding-top: 40px; font-size: 14px;">投稿がありません</p>`;
      return;
    }

    list.forEach(post => {
      const color = getCategoryColor(post.category);
      const item = document.createElement('div');
      item.className = 'sidebar-post';
      item.style.setProperty('--category-color', color);

      item.innerHTML = `
        <div class="sidebar-post-header">
          <div class="sidebar-post-name">
            ${escapeHtml(post.display_name || '名無しさん')}
          </div>
          <div class="sidebar-post-date">${formatDate(post.created_at)}</div>
        </div>
        
        <div class="sidebar-post-info" style="font-size:12px; color:var(--text-secondary); margin-bottom: 8px; display:flex; gap:8px;">
          <span><i class="fa-solid fa-user"></i> ${escapeHtml(post.age_group || '年代不明')}</span>
          <span><i class="fa-solid fa-venus-mars"></i> ${escapeHtml(post.gender || '性別不明')}</span>
          <span style="margin-left:auto; color:var(--primary); font-weight:700;">
            ${escapeHtml(post.category || '未分類')}
          </span>
        </div>

        <div class="sidebar-post-content" style="-webkit-line-clamp: 4; line-clamp: 4;">
          ${escapeHtml(post.content || '(本文なし)')}
        </div>

        <div style="display:flex; justify-content: flex-start; align-items: center; margin-top: auto; padding-top: 12px; gap: 16px;">
          <div style="display:flex; gap:6px; font-size:13px; color:var(--text-secondary); background:rgba(0,0,0,0.03); padding:4px 10px; border-radius:20px;">
            <i class="fa-regular fa-heart" style="color:#e63946;"></i> 
            <span style="font-weight:700;">${post.likes || post.likes_count || 0}</span>
          </div>
          <div style="display:flex; gap:6px; font-size:13px; color:var(--text-secondary); background:rgba(0,0,0,0.03); padding:4px 10px; border-radius:20px;">
            <i class="fa-regular fa-comment" style="color:var(--primary);"></i> 
            <span style="font-weight:700;">${post.comments_count || 0}</span>
          </div>
        </div>
      `;

      // マップ上で該当ピンにズーム＆ポップアップ
      item.addEventListener('click', (e) => {
        // モバイルでカードをクリックした際に、サイドバーを閉じてマップを見やすくする配慮
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('show');
          document.body.classList.remove('sidebar-open');
        }

        const offsetLat = 0.002;
        map.setView([post.lat - offsetLat, post.lng], 15, { animate: true });
        map.eachLayer(layer => {
          if (layer.getLatLng && layer.getLatLng().lat === post.lat && layer.getLatLng().lng === post.lng) {
            setTimeout(() => layer.openPopup(), 400);
          }
        });
      });

      postList.appendChild(item);
    });
  }

  // --- モバイル用トグル/スワイプ設設定 ---
  const header = sidebar.querySelector('.sidebar-header');

  let startY = 0;
  let isDragging = false;

  header.addEventListener('mousedown', (e) => {
    if (window.innerWidth > 768) return;
    startY = e.clientY;
    isDragging = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const diff = startY - e.clientY;
    if (diff > 50) {
      sidebar.classList.add('show');
      document.body.classList.add('sidebar-open');
      isDragging = false;
    } else if (diff < -50) {
      sidebar.classList.remove('show');
      document.body.classList.remove('sidebar-open');
      isDragging = false;
    }
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  // Touch support
  header.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 768) return;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const diff = startY - e.touches[0].clientY;
    if (diff > 50) {
      sidebar.classList.add('show');
      document.body.classList.add('sidebar-open');
      isDragging = false;
    } else if (diff < -50) {
      sidebar.classList.remove('show');
      document.body.classList.remove('sidebar-open');
      isDragging = false;
    }
  }, { passive: true });

  header.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      const isShow = sidebar.classList.toggle('show');
      document.body.classList.toggle('sidebar-open', isShow);
    }
  });

  function formatDate(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;

    // 24時間以内なら「〜時間前」的な感じにしたいが、シンプルに
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

