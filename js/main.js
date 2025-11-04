import { setupSupabase } from './api.js';
import { initMap } from './map.js';
import { setupUI } from './ui.js';
import { initSidebar } from './sidebar.js';

const supabase = setupSupabase();
let cleanupSidebar = null;
let mapInstance = null;

// ---------------------------
// 📄 ページ切り替え処理
// ---------------------------
async function showPage(page) {
  console.log(`🧭 ページ切り替え: ${page}`);
  const content = document.getElementById('content');

  if (cleanupSidebar) {
    cleanupSidebar();
    cleanupSidebar = null;
  }

  content.innerHTML = '';

  // ===============================
  // 🗺 意見投稿マップページ
  // ===============================
  if (page === 'map') {
    const mapPage = document.createElement('div');
    mapPage.id = 'mapPage';
    mapPage.classList.add('page', 'active');
    mapPage.innerHTML = `
      <aside id="sidebar"></aside>
      <div id="map"></div>
      <button id="postBtn">＋ 新しい意見を投稿</button>
    `;
    content.appendChild(mapPage);

    setupUI();

    // --- 地図描画（DOM安定を待つ）
    await new Promise(res => setTimeout(res, 100));

    // --- 地図初期化 ---
    mapInstance = await initMap(supabase);
    document.getElementById('mapPage').classList.add('ready');
    mapInstance.setView([34.66175, 133.9346], 11);

    // --- 投稿一覧読込＋サイドバー初期化 ---
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('⚠️ 投稿取得エラー:', error);
    } else {
      cleanupSidebar = await initSidebar(supabase, posts, mapInstance);

      // ✅ 初回のみグローバルイベント委譲をセット
      if (typeof window.attachGlobalEvents === 'function') {
        window.attachGlobalEvents(supabase);
      }
    }

    console.log('✅ 意見マップ起動完了');
    return;
  }

  // ===============================
  // 🔗 関係性マップ
  // ===============================
  if (page === 'relation') {
    content.innerHTML = `
      <div class="page active" style="padding:16px;">
        <h2>関係性マップ</h2>
        <p>市政の現状や意見の関連性を可視化するマップを構築予定です。</p>
      </div>
    `;
    return;
  }

  // ===============================
  // 💡 課題解決アイデア
  // ===============================
  if (page === 'ideas') {
    content.innerHTML = `
      <div class="page active" style="padding:16px;">
        <h2>課題解決アイデア</h2>
        <p>課題解決に係る市民の議論ができる機能を構築予定です。</p>
      </div>
    `;
    return;
  }

  // ===============================
  // ℹ️ このサイトについて
  // ===============================
  if (page === 'about') {
    content.innerHTML = `
      <div class="page active about-page">
        <h2>このサイトについて</h2>
        <p>このサイトは市民の声を集め、AIを用いて行政の可視化を行う「デジタル民主主義」実証実験です。</p>
        <p>実験中のため、仕様変更やデータ削除の可能性があります。</p>
        <p>ご意見・ご提案はメールやSNSでお寄せください😊</p>
        <a href="./data/2025-10-29 142909.png" target="_blank">
          <img src="./data/2025-10-29 142909.png" alt="デジタル民主主義概念図" style="max-width:30%; border-radius:6px;">
        </a>
        <p>開発・運営：神﨑政人（かんざきまさと）</p>
        <p><a href="mailto:info@kanzaki-okayama.org">info@kanzaki-okayama.org</a></p>
        <p><a href="https://www.kanzaki-okayama.org/" target="_blank">公式HP</a></p>
        <p><a href="https://x.com/kanzaki_channel" target="_blank">X</a></p>
        <p><a href="https://www.youtube.com/@kanzaki-okayama" target="_blank">YouTube</a></p>
        <p><a href="https://www.instagram.com/kanzaki_okayama/" target="_blank">Instagram</a></p>
        <h3 style="margin-top:24px;">AI回答の参考資料一覧（RAG対象）</h3>
        <div id="documents-list" style="max-height:300px; overflow-y:auto; border:1px solid #ddd; padding:8px; border-radius:6px; background:#fafafa;">読み込み中...</div>
      </div>
    `;
    loadDocumentsList();
    return;
  }
}

// --- RAG資料一覧取得 ---
async function loadDocumentsList() {
  const listContainer = document.getElementById('documents-list');
  if (!listContainer) return;

  const { data, error } = await supabase
    .from('documents')
    .select('title')
    .order('title', { ascending: true });

  if (error) {
    console.error('❌ ドキュメント取得エラー:', error);
    listContainer.textContent = '読み込みに失敗しました。';
    return;
  }

  const uniqueTitles = [...new Set(data.map(d => d.title))];
  listContainer.innerHTML = uniqueTitles.length
    ? `<ul style="line-height:1.6;">${uniqueTitles.map(t => `<li>${t}</li>`).join('')}</ul>`
    : '登録されている資料はまだありません。';

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

  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const page = btn.dataset.page;
      if (page) showPage(page);
    });
  });

  showPage('map');
});
