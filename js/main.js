import { setupSupabase } from './api.js';
import { initMap } from './map.js';
import { setupUI, openModal } from './ui.js';
import { initSidebar } from './sidebar.js';
import { initIdeasBoard } from './ideas.js';

const supabase = setupSupabase();
let cleanupSidebar = null;
let mapInstance = null;

// ---------------------------
// 📄 ページ切り替え処理
// ---------------------------
async function showPage(page) {
  // --- Cleanup for SPA navigation ---
  if (cleanupSidebar) {
    cleanupSidebar();
    cleanupSidebar = null;
  }

  // --- Navbar Active State ---
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.toggle('active', link.dataset.page === page);
  });

  content.innerHTML = '';
  document.body.classList.remove('sidebar-open');
  window.scrollTo(0, 0);

  // ===============================
  // 🗺 意見投稿マップページ
  // ===============================
  if (page === 'map') {
    const mapPage = document.createElement('div');
    mapPage.id = 'mapPage';
    mapPage.className = 'page-container';
    mapPage.innerHTML = `
      <aside id="sidebar"></aside>
      <div id="map"></div>
      <button id="postBtn" class="floating-btn">＋ 新しい意見を投稿</button>
    `;
    content.appendChild(mapPage);

    // --- 投稿ボタンの紐付け (地図読み込み前でも押せるようにする) ---
    const postBtn = document.getElementById('postBtn');
    if (postBtn) {
      postBtn.onclick = () => {
        // mapInstanceが未定義の場合はnullが渡る（ui.js側でハンドリング済）
        openModal(null, supabase, mapInstance, null);
      };
    }

    // --- 地図描画（DOM安定を待つ）
    await new Promise(res => setTimeout(res, 100));

    // --- 地図初期化 ---
    try {
      mapInstance = await initMap(supabase);
      mapPage.classList.add('ready');
      mapInstance.setView([34.66175, 133.9346], 11);
    } catch (err) {
      console.error('❌ 地図初期化エラー:', err);
      // エラー時でもボタンは動作する
    }

    // --- 投稿一覧読込＋サイドバー初期化 ---
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('⚠️ 投稿取得エラー:', error);
    } else {
      cleanupSidebar = await initSidebar(supabase, posts, mapInstance);
    }
    return;
  }

  // ===============================
  // 🔗 関係性マップ
  // ===============================
  if (page === 'relation') {
    content.innerHTML = `
      <div class="page-container glass-bg" style="padding:0; height: calc(100vh - 64px); max-width: none;">
        <iframe src="network_visualization_values_embedded/network_visualization_values_embedded_fixed.html" 
                style="width: 100%; height: 100%; border: none; display: block;"></iframe>
      </div>
    `;
    return;
  }

  // ===============================
  // 💡 課題解決アイデア
  // ===============================
  if (page === 'ideas') {
    content.innerHTML = `
      <div class="page-container board-page">
        <div class="construction-banner" style="background:#fff7ed; border:1px solid #ffedd5; color:#9a3412; padding:12px 20px; border-radius:12px; margin-bottom:24px; font-size:14px; font-weight:600; display:flex; align-items:center; gap:10px;">
          <i class="fa-solid fa-screwdriver-wrench"></i> 【現在構築中】このページは開発中のイメージです。実データとの連携は準備中です。
        </div>
        <header class="page-header">
          <div class="header-text">
            <h1 class="page-title">課題解決アイデア</h1>
            <p class="page-subtitle">地域をより良くするための具体的な提案（アイデア）です。皆の賛同が集まると政策検討の優先順位が上がります。</p>
          </div>
          <button id="addIdeaBtn" class="nav-link btn-primary">
            <i class="fa-solid fa-plus"></i> アイデアを提案
          </button>
        </header>
        <div id="ideasBoard" class="ideas-grid">
           <!-- アイデアカードがここに動的に追加される -->
        </div>
      </div>
    `;
    initIdeasBoard(supabase);
    document.getElementById('addIdeaBtn').onclick = () => {
      import('./ui.js').then(ui => ui.showToast('アイデア提案機能は現在準備中です。実験参加をご希望の方はお問い合わせください。'));
    };
    return;
  }

  // ===============================
  // ℹ️ このサイトについて
  // ===============================
  if (page === 'about') {
    content.innerHTML = `
      <div class="page-container about-page">
        <section class="about-hero glass-card">
          <h1 class="page-title">デジタル民主主義PoC</h1>
          <p class="premium-text">市民の声とテクノロジーを融合させ、岡山市の未来を共に描く実験プラットフォームです。</p>
        </section>

        <div class="about-grid">
          <div class="glass-card info-card">
            <h3><i class="fa-solid fa-bullseye"></i> 目的</h3>
            <p>複雑化する地域課題に対し、個別の意見をAIが分析・集約。根拠に基づいた合意形成を支援し、行政と市民の距離をゼロにします。</p>
          </div>
          <div class="glass-card info-card">
            <h3><i class="fa-solid fa-code-branch"></i> 技術</h3>

            <p>OpenAIのLLMとSupabase Vectorを融合。議事録から「争点」と「価値観」を自動抽出し、ナレッジグラフとして構造化しました。単なる検索を超え、議論の全体像を俯瞰できる「価値可視化（Value Landscape）」を実現しています。</p>
          </div>
        </div>

        <section class="concept-section glass-card">
          <h3>コンセプト図</h3>
          <a href="./data/2025-12-24 000042.png" target="_blank" class="concept-image-link">
            <img src="./data/2025-12-24 000042.png" alt="デジタル民主主義概念図">
          </a>
        </section>

        <section class="contact-section glass-card">
          <h3>Contact & Links</h3>
          <div class="contact-methods" style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <a href="mailto:info@kanzaki-okayama.org" style="text-decoration:none; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-envelope" style="color:var(--primary); width:20px;"></i> <span>info@kanzaki-okayama.org</span>
            </a>
            <a href="https://kanzaki-okayama.org/" target="_blank" style="text-decoration:none; color:var(--text-main); display:flex; align-items:center; gap:10px;">
              <i class="fa-solid fa-globe" style="color:var(--primary); width:20px;"></i> <span>https://kanzaki-okayama.org/</span>
            </a>
            <div style="display:flex; gap:16px;">
              <a href="https://x.com/kanzaki_channel" target="_blank" style="color:var(--text-secondary); font-size:20px;"><i class="fa-brands fa-x-twitter"></i></a>
              <a href="https://www.youtube.com/@kanzaki-okayama" target="_blank" style="color:var(--text-secondary); font-size:20px;"><i class="fa-brands fa-youtube"></i></a>
              <a href="https://www.instagram.com/kanzaki_okayama/" target="_blank" style="color:var(--text-secondary); font-size:20px;"><i class="fa-brands fa-instagram"></i></a>
            </div>
          </div>
          <p class="author-info" style="font-weight:700;">Developed by 神﨑 政人 (Masato Kanzaki) / Okayama</p>
        </section>

        <section class="docs-section glass-card">
          <h3>AI回答の参照ドキュメント</h3>
          <p class="docs-count">現在 <span id="docs-count-num">...</span> 件の資料がベクトル化されています。</p>
          <div id="documents-list" class="mini-docs-list">読み込み中...</div>
        </section>
      </div>
    `;
    loadDocumentsList();
    return;
  }
}

// --- RAG資料一覧取得（完全版） ---
async function loadDocumentsList() {
  const listContainer = document.getElementById('documents-list');
  if (!listContainer) return;

  // 🔹 ページングで全件取得
  let allDocs = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('documents')
      .select('id, title')
      .order('title', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('❌ ドキュメント取得エラー:', error);
      listContainer.textContent = '読み込みに失敗しました。';
      return;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      allDocs = allDocs.concat(data);
      from += pageSize;
      console.log(`📄 取得件数: ${allDocs.length}`);
      if (data.length < pageSize) hasMore = false;
    }
  }

  // 🔹 タイトル重複を除外（必要なら）
  const uniqueTitles = [...new Set(allDocs.map(d => d.title))];

  // ✅ 件数表示を更新
  const countEl = document.getElementById('docs-count-num');
  if (countEl) countEl.textContent = uniqueTitles.length;

  listContainer.innerHTML = uniqueTitles.length
    ? `<ul style="line-height:1.6;">${uniqueTitles.map(t => `<li>${t}</li>`).join('')}</ul>`
    : '登録されている資料はまだありません。';

  // 🔹 リアルタイム更新購読
  supabase
    .channel('documents-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'documents' }, loadDocumentsList)
    .subscribe();
}

// ---------------------------
// 🚀 初期化
// ---------------------------
window.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOMContentLoaded: イベント設定開始');

  const hamburger = document.getElementById('hamburger');
  const navbarMenu = document.getElementById('navbarMenu');

  // --- 🍔 ハンバーガーメニュー開閉 ---
  if (hamburger && navbarMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navbarMenu.classList.toggle('open');
    });
  }

  // --- 🧭 ナビゲーションリンク ---
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const page = btn.dataset.page;

      // メニューを閉じる
      if (hamburger) hamburger.classList.remove('active');
      if (navbarMenu) navbarMenu.classList.remove('open');

      if (page) showPage(page);
    });
  });

  showPage('map');
});
