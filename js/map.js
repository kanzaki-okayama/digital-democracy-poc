import { fetchPosts, fetchReplies } from './api.js';
import { openModal, showToast } from './ui.js';
import { initSidebar } from './sidebar.js';

// --- 🧭 各レイヤーをグローバル変数として保持 ---
let cityLayer = null;
let wardLayer = null;
let chomeLayer = null;
let selectedLayer = null;

export async function initMap(supabase) {
  // ✅ 初期中心：岡山市役所（zoom 11）
  const map = L.map('map', { zoomControl: false }).setView([34.66175, 133.9346], 11);

  // --- タイル読み込みなど続行 ---
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const posts = await fetchPosts(supabase);
  posts.forEach(p => addMarker(map, p, supabase));

  // --- 📊 凡例は削除（ユーザー要望により） ---
  // const legend = L.control({ position: 'bottomright' });
  // legend.onAdd = ... (removed)
  // legend.addTo(map);

  cityLayer = await loadLayer(map, supabase, 'data/oka_city.geojson', 'N03_004', '#0055cc');
  wardLayer = await loadLayer(map, supabase, 'data/oka_ward.geojson', 'N03_005', '#009966');
  chomeLayer = await loadLayer(map, supabase, 'data/oka_chome.geojson', 'S_NAME', '#66cc66');

  function updateVisibleLayer() {
    const z = map.getZoom();
    map.eachLayer(l => { if (l instanceof L.GeoJSON) map.removeLayer(l); });
    if (z <= 11) cityLayer.addTo(map);
    else if (z <= 13) wardLayer.addTo(map);
    else chomeLayer.addTo(map);
  }

  updateVisibleLayer();
  map.on('zoomend', updateVisibleLayer);

  console.log('3階層ズーム連動マップ 起動完了');

  // --- ポップアップ開閉時の一覧制御（スマホのみ） ---
  map.on('popupopen', () => {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebar.classList.add('dimmed');
        sidebar.dataset.dimmedByPopup = "true"; // ← 明示的に印を残す
      }
    }
  });

  map.on('popupclose', () => {
    if (window.innerWidth <= 768) {
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.dataset.dimmedByPopup === "true") {
        sidebar.classList.remove('dimmed');
        delete sidebar.dataset.dimmedByPopup;
      }
    }
  });
  // ✅ 初期状態で .dimmed が付いていた場合の安全リセット
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('dimmed');


  return map;
}

// --- GeoJSONレイヤー共通処理 ---
async function loadLayer(map, supabase, url, nameField, color) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} が読み込めません`);
  const data = await res.json();

  const filtered = data.features.filter(f => {
    const p = f.properties || {};
    if (url.includes('oka_city') || url.includes('oka_ward')) return p.N03_004 === "岡山市";
    if (url.includes('oka_chome')) {
      return (
        p.CITY_NAME === "岡山市" ||
        p.N03_004 === "岡山市" ||
        (p.PREF_NAME === "岡山県" && String(p.CITY_NAME)?.includes("岡山市"))
      );
    }
    return true;
  });

  console.log(`${url} 読み込み完了: ${filtered.length}件`);

  const layer = L.geoJSON({ type: 'FeatureCollection', features: filtered }, {
    style: { color, weight: 0.8, fillOpacity: 0.12 },
    smoothFactor: 1.2,
    onEachFeature: (f, lyr) => {
      const props = f.properties;
      const name = props[nameField]?.trim() || props.N03_004?.trim() || props.N03_005?.trim() ||
        props.CITY_NAME?.trim() || props.PREF_NAME?.trim() || '名称未設定';

      const defaultStyle = { color, weight: 0.8, fillOpacity: 0.12 };
      const highlightStyle = { color: '#ff6600', weight: 2.5, fillOpacity: 0.3 };

      lyr.setStyle(defaultStyle);
      lyr.bindTooltip(name, { permanent: false, direction: 'center', className: 'chome-tooltip' });

      lyr.on('mouseover', () => { if (selectedLayer !== lyr) lyr.setStyle(highlightStyle); });
      lyr.on('mouseout', () => { if (selectedLayer !== lyr) lyr.setStyle(defaultStyle); });

      lyr.on('click', e => {
        e.originalEvent._fromPolygon = true;
        if (selectedLayer && selectedLayer !== lyr) selectedLayer.setStyle(defaultStyle);
        selectedLayer = lyr;
        lyr.setStyle(highlightStyle);
      });
    }
  });

  return layer;
}



// --- 🧭 緯度経度から字情報を返す（改良版・点inポリゴン対応） ---
export function getRegionInfo(latlng) {
  if (!chomeLayer) return null;

  const point = [latlng.lng, latlng.lat]; // GeoJSONは [lng, lat] 順

  function pointInPolygon(pt, polygon) {
    let inside = false;
    const [x, y] = pt;
    for (let ring of polygon) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        const intersect =
          ((yi > y) !== (yj > y)) &&
          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
    }
    return inside;
  }

  let foundFeature = null;
  chomeLayer.eachLayer(layer => {
    const f = layer.feature;
    const geom = f.geometry;
    if (!geom) return;

    if (geom.type === "Polygon" && pointInPolygon(point, geom.coordinates)) {
      foundFeature = f;
    } else if (geom.type === "MultiPolygon") {
      for (const poly of geom.coordinates) {
        if (pointInPolygon(point, poly)) {
          foundFeature = f;
          break;
        }
      }
    }
  });

  if (!foundFeature) return null;
  const props = foundFeature.properties;
  const city = props.CITY_NAME || props.N03_004 || "岡山市";
  const ward = props.N03_005 || (props.CITY_NAME?.match(/岡山市(.+区)/)?.[1] ?? null);
  const chome = props.S_NAME || props.N03_006 || null;
  return { city, ward, chome };
}


// --- 投稿ピンの描画 ---
export function addMarker(map, post, supabase) {
  if (!post.lat || !post.lng) {
    const baseLat = 34.6617, baseLng = 133.9350;
    const jitter = () => (Math.random() - 0.5) * 0.001;
    post.lat = baseLat + jitter(); post.lng = baseLng + jitter();
  }

  const iconColor = getCategoryColor(post.category);
  const customIcon = L.divIcon({
    className: "custom-pin",
    html: `<div style="position: relative; width: 26px; height: 26px;">
             <div style="width: 26px; height: 26px; background:${iconColor};
             border-radius:50%; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.4);"></div>
           </div>`,
    iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
  });

  const marker = L.marker([post.lat, post.lng], { icon: customIcon }).addTo(map);

  // --- ピンをクリックしたらその位置を地図中央に移動 ---
  marker.on('click', e => {
    e.originalEvent._fromMarker = true;

    // 中央よりやや下に配置（ポップがナビバーに隠れないように）
    const offsetLat = 0.002; // 調整値（約200m下）
    const newLatLng = L.latLng(post.lat - offsetLat, post.lng);

    // ✅ setView で中央移動（一覧クリックと同等アニメーション）
    map.setView(newLatLng, map.getZoom(), { animate: true });

    // ✅ 少し遅らせてポップアップを開く（移動完了後）
    setTimeout(() => {
      marker.openPopup();
    }, 300);
  });

  // --- ポップアップHTML ---
  const buildPopupHTML = async () => {
    const replies = await fetchReplies(supabase, post.id);
    const { data: existing } = await supabase
      .from('ai_responses')
      .select('ai_answer, sources')
      .eq('post_id', post.id)
      .maybeSingle();

    // 🔸 ここで localStorage をチェック
    const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
    const alreadyLiked = likedPosts.includes(post.id);

    // ❤️ 既に賛同済みならピンクのハート
    const heartIcon = alreadyLiked ? "❤️" : "🤍";
    const heartColor = alreadyLiked ? "#e63946" : "#999";

    let aiAnswerHTML = '';
    if (existing?.ai_answer) {
      aiAnswerHTML += `<p style="margin-top:6px; color:#333; white-space:pre-line;">${escapeHtml(existing.ai_answer)}</p>`;

      if (existing.sources) {
        try {
          const parsed = JSON.parse(existing.sources);
          if (Array.isArray(parsed) && parsed.length > 0) {
            aiAnswerHTML += `
            <div style="margin-top:8px; font-size:12px; color:#555;">
              <b>📚 参考資料（関連が高い順）</b>
              <ul style="margin:4px 0 0 16px; padding:0; list-style-type:disc;">
          `;
            parsed.forEach((s, i) => {
              const title = escapeHtml(s.title || `資料${i + 1}`);
              const url = escapeHtml(s.url || "#");
              aiAnswerHTML += `
              <li style="margin-bottom:2px;">
                <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
              </li>
            `;
            });
            aiAnswerHTML += `
              </ul>
            </div>
          `;
          }
        } catch (err) {
          console.error("📚 参考資料JSONパース失敗:", err);
        }
      }
    } else {
      aiAnswerHTML = '⏳ AIが回答を生成中です...';
    }
    return `
    <div class="popup">
      ${(post.city_name || post.ward_name || post.chome_name)
        ? `<div class="popup-region" style="font-size:13px; color:#333; margin-bottom:4px;">📍 ${escapeHtml([post.city_name, post.ward_name, post.chome_name].filter(Boolean).join(' '))}</div>`
        : `<div class="popup-region" style="font-size:13px; color:#555; margin-bottom:4px;">📍 （市全体への意見）</div>`}

      <div class="popup-attributes" style="font-size:12px; color:#666;">
        👤 ${escapeHtml(post.age_group || '未回答')}・${escapeHtml(post.gender || '未回答')}
      </div>

      <div class="popup-header">
        <b>${escapeHtml(post.display_name)}</b>
        <span style="font-size:11px; color:#888; margin-left:6px;">${formatDate(post.created_at)}</span>
      </div>

      <div class="popup-category" style="font-size:12px; color:#555;">
        🗂️ ${escapeHtml(post.category || '未分類')}
      </div>

      <!-- 💬 投稿内容 -->
      <div class="popup-content" style="white-space:pre-line;">
        ${escapeHtml((post.content || '').trimStart())}
      </div>

      <!-- ❤️ 賛同ボタン（意見とAI回答の間・右端） -->
      <div class="popup-like" style="
        margin-top:8px;
        display:flex;
        justify-content:flex-end;
      ">
        <button class="heart-btn" data-id="${post.id}" style="
          background:none;
          border:none;
          cursor:pointer;
          font-size:18px;
          color:${heartColor};
          transition:color 0.2s ease, transform 0.2s ease;
        ">
          ${heartIcon} <span class="heart-count" style="font-size:13px;">${post.likes || 0}</span>
        </button>
      </div>

      <!-- 🤖 AI回答（意見の下、返信の上） -->
      <div class="ai-box" id="ai-box-${post.id}" style="margin-top:10px; padding:8px; font-size:13px; border-top:1px solid #ddd; background:#fafafa;">
        <b>🤖 AI回答（市・市議会の資料に基づく回答）</b><br>
        <div id="ai-text-${post.id}" style="margin-top:6px; color:#333;">${aiAnswerHTML}</div>
        <button id="regen-ai-${post.id}" style="margin-top:6px; background:#f5f5f5; border:1px solid #ccc;
          padding:4px 8px; border-radius:4px; cursor:pointer;">🔁 再回答</button>
      </div>


      <!-- 💬 返信一覧 -->
      <div class="popup-replies" id="replies-${post.id}" style="margin-top:8px;">
        ${replies.map(r => `
          <div class="reply" style="margin-bottom:4px;">
            <b>${escapeHtml(r.display_name)}</b>
            <span style="font-size:11px; color:#888; margin-left:4px;">${formatDate(r.created_at)}</span><br/>
            <span>${escapeHtml(r.content)}</span>
          </div>`).join('')}
      </div>

      <!-- 📝 返信フォーム -->
      <form class="reply-form" style="margin-top:8px;">
        <input name="name" maxlength="50" placeholder="ニックネーム" required />
        <textarea name="content" rows="2" maxlength="500" placeholder="返信..." required></textarea>
        <button type="submit">返信</button>
      </form>
    </div>`;
  };



  marker.bindPopup('<div class="popup-loading">読み込み中...</div>', {
    maxWidth: 480,
    minWidth: 280,
    autoPan: true,
    autoPanPaddingTopLeft: [0, 80],   // ← 上方向に80px余裕（ナビバー+マージン）
    autoPanPaddingBottomRight: [0, 20] // ← 下端の余裕も少し
  });


  marker.on('popupopen', async () => {
    const popup = marker.getPopup();
    const html = await buildPopupHTML();
    popup.setContent(html);

    const aiText = document.getElementById(`ai-text-${post.id}`);
    const regenBtn = document.getElementById(`regen-ai-${post.id}`);

    // ✅ LeafletがDOMを挿入し終わるのを少し待つ
    setTimeout(() => {
      const popupEl = popup.getElement();  // ← 今開いたポップアップ要素      
    }, 50); // ← 少し待ってから取得

    // --- AI回答生成（再回答ボタン専用） ---
    async function generateAIAnswer(isRegen = false) {
      aiText.textContent = isRegen
        ? "🧠 再回答を生成中..."
        : "⏳ AIが回答を生成中です...";

      try {
        const res = await fetch(
          "https://eispzocmbopasgcvgxmi.functions.supabase.co/ai-rag-answer2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: post.id,
              query: `
          【地域】${[
                  post.city_name || "岡山市",
                  post.ward_name || "",
                  post.chome_name || ""
                ].filter(Boolean).join(" ")}
          【質問】${post.content}
            `.trim(),
            }),
          }
        );

        const data = await res.json();
        if (!res.ok || !data) throw new Error(data.error || "AI回答取得に失敗");

        const answer = data.answer || "回答を取得できませんでした。";
        const sources = Array.isArray(data.sources) ? data.sources : [];

        let html = `<p style="margin-top:6px; color:#333; white-space:pre-line;">${escapeHtml(answer)}</p>`;
        if (sources.length > 0) {
          const listItems = sources.map((s, i) => {
            const title = escapeHtml(s.title || `資料${i + 1}`);
            const url = escapeHtml(s.url || "#");
            return `
              <li style="margin-bottom:2px;">
                <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
              </li>`;
          }).join("");

          html += `
            <div style="margin-top:8px; font-size:12px; color:#555;">
              <b>📚 参考資料（関連が高い順）</b>
              <ul style="margin:4px 0 0 16px; padding:0; list-style-type:disc; list-style-position:outside;">
                ${listItems}
              </ul>
            </div>`;
        }
        aiText.innerHTML = html;

      } catch (err) {
        console.error("❌ AI回答エラー:", err);
        aiText.innerHTML = `<span style="color:red;">AI回答の取得に失敗しました。</span>`;
      }
    }

    // ✅ 「既存AI回答が無い場合」は初回生成
    if (aiText.textContent.includes("⏳ AIが回答を生成中です")) {
      console.log(`🧠 新規投稿: AI回答を生成開始 (post_id=${post.id})`);
      await generateAIAnswer(false);
    }

    // --- ✅ 再回答ボタン（AI再生成） ---
    regenBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      regenBtn.disabled = true;
      regenBtn.textContent = "再回答中...";

      aiText.textContent = "🧠 再回答を生成中...";

      try {
        const res = await fetch(
          "https://eispzocmbopasgcvgxmi.functions.supabase.co/ai-rag-answer2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: post.id,            // ✅ 正確なpost_id
              query: post.content,         // ✅ 投稿本文を送信
              city_name: post.city_name,   // ✅ 地域情報も送る
              ward_name: post.ward_name,
              chome_name: post.chome_name,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI回答生成に失敗しました");

        const answer = data.answer || "回答を取得できませんでした。";
        const sources = Array.isArray(data.sources) ? data.sources : [];

        // ✅ 表示更新
        let html = `<p style="margin-top:6px; color:#333; white-space:pre-line;">${escapeHtml(answer)}</p>`;
        if (sources.length > 0) {
          html += `<div style="margin-top:8px; font-size:12px; color:#555;"><b>📚 参考資料</b><br>`;
          sources.forEach((s, i) => {
            const title = escapeHtml(s.title || `資料${i + 1}`);
            const url = escapeHtml(s.url || "#");
            html += `・<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a><br>`;
          });
          html += `</div>`;
        }
        aiText.innerHTML = html;

      } catch (err) {
        console.error("❌ 再回答処理エラー:", err);
        aiText.innerHTML = `<span style="color:red;">AI回答の生成に失敗しました。</span>`;
      } finally {
        regenBtn.textContent = "🔁 再回答";
        regenBtn.disabled = false;
      }
    });

    // ✅ --- 返信送信（変更なし） ---
    const replyForm = popup.getElement().querySelector(".reply-form");
    const repliesContainer = popup.getElement().querySelector(".popup-replies");

    if (replyForm) {
      replyForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const name = replyForm.querySelector('input[name="name"]').value.trim();
        const content = replyForm.querySelector('textarea[name="content"]').value.trim();
        if (!name || !content) return alert("ニックネームと返信内容を入力してください。");

        try {
          const { error } = await supabase.from("replies").insert([
            { post_id: post.id, display_name: name, content: content },
          ]);
          if (error) throw error;
          replyForm.reset();

          const { data: newReplies } = await supabase
            .from("replies")
            .select("*")
            .eq("post_id", post.id)
            .order("created_at", { ascending: true });

          repliesContainer.innerHTML = newReplies
            .map(
              (r) => `
            <div class="reply" style="margin-bottom:4px;">
              <b>${escapeHtml(r.display_name)}</b>
              <span style="font-size:11px; color:#888; margin-left:4px;">${formatDate(r.created_at)}</span><br/>
              <span>${escapeHtml(r.content)}</span>
            </div>`
            )
            .join("");

          if (typeof showToast === "function") showToast("返信を投稿しました");
        } catch (err) {
          console.error("返信投稿エラー:", err);
          alert("返信の投稿に失敗しました。");
        }
      });
    }
  }); // ← ここで popupopen の閉じカッコ！
  return marker;
}


// --- カテゴリカラー ---
function getCategoryColor(category) {
  switch (category) {
    case '地域経済': return '#ff7f0e';
    case '交通・道路': return '#1f77b4';
    case '子育て・教育・高齢者福祉': return '#2ca02c';
    case '若者支援・雇用': return '#9467bd';
    case '医療・健康': return '#d62728';
    case '自然・環境': return '#17becf';
    case '防災・安全': return '#bcbd22';
    case '行政・政治改革': return '#8c564b';
    case 'その他': return '#7f7f7f';
    default: return '#cccccc';
  }
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>\"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// // ================================
// 🌐 グローバルイベント委譲を安全にアタッチ
// ================================
window.attachGlobalEvents = function (supabase) {
  if (window.__globalEventsAttached) return;
  window.__globalEventsAttached = true;

  console.log("✅ グローバルイベント委譲セット完了");

  document.addEventListener("click", async (e) => {
    // ❤️ 賛同ボタン（変更なし）
    const heartBtn = e.target.closest(".heart-btn");
    if (heartBtn) {
      e.preventDefault();
      const postId = parseInt(heartBtn.dataset.id);
      const likedPosts = JSON.parse(localStorage.getItem("likedPosts") || "[]");
      if (likedPosts.includes(postId)) {
        showToast?.("この投稿にはすでに賛同済みです ❤️");
        return;
      }

      heartBtn.classList.add("liked", "bounce");
      setTimeout(() => heartBtn.classList.remove("bounce"), 300);
      const countEl = heartBtn.querySelector(".heart-count");
      let currentLikes = parseInt(countEl?.textContent || "0") + 1;
      // 見た目を即時反映（アイコンを❤️に、色をピンクに）
      heartBtn.style.color = "#e63946";
      heartBtn.innerHTML = `❤️ <span class="heart-count">${currentLikes}</span>`;


      const { error } = await supabase
        .from("posts")
        .update({ likes: currentLikes })
        .eq("id", postId);
      if (error) console.error("❌ 賛同更新エラー:", error);
      else showToast?.("賛同しました ❤️");
      // ✅ 即時UI反映済みなので、ローカルのpost.likesも更新
      const targetPost = window.__posts?.find?.(p => p.id === postId);
      if (targetPost) targetPost.likes = currentLikes;

      likedPosts.push(postId);
      localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
      return;



      likedPosts.push(postId);
      localStorage.setItem("likedPosts", JSON.stringify(likedPosts));
      return;
    }

    // 🔁 再回答ボタン（ここを修正）
    const regenBtn = e.target.closest('[id^="regen-ai-"]');
    if (regenBtn) {
      e.preventDefault();
      const postId = parseInt(regenBtn.id.replace("regen-ai-", ""));
      const aiText = document.getElementById(`ai-text-${postId}`);
      const popupEl = regenBtn.closest(".popup");
      if (!popupEl) return;

      // 🧩 投稿情報を取得（popup 内に埋め込まれたデータから）
      const regionEl = popupEl.querySelector(".popup-region");
      const contentEl = popupEl.querySelector(".popup-content");
      const regionText = regionEl?.textContent?.replace("📍", "").trim() || "";
      const contentText = contentEl?.textContent?.trim() || "";

      regenBtn.disabled = true;
      regenBtn.textContent = "再回答中...";
      aiText.textContent = "🧠 再回答を生成中...";

      try {
        // ✅ city, ward, chome を可能な限り抽出
        const [city_name, ward_name, chome_name] = regionText
          .split(/\s+/)
          .map((s) => s.trim());

        const res = await fetch(
          "https://eispzocmbopasgcvgxmi.functions.supabase.co/ai-rag-answer2",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              post_id: postId,
              query: contentText,
              city_name,
              ward_name,
              chome_name,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI回答生成に失敗");

        const answer = data.answer || "回答を取得できませんでした。";
        const sources = Array.isArray(data.sources) ? data.sources : [];

        let html = `<p style="margin-top:6px; color:#333; white-space:pre-line;">${escapeHtml(answer)}</p>`;
        if (sources.length > 0) {
          const listItems = sources.map((s, i) => {
            const title = escapeHtml(s.title || `資料${i + 1}`);
            const url = escapeHtml(s.url || "#");
            return `
              <li style="margin-bottom:2px;">
                <a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>
              </li>`;
          }).join("");

          html += `
            <div style="margin-top:8px; font-size:12px; color:#555;">
              <b>📚 参考資料（関連が高い順）</b>
              <ul style="margin:4px 0 0 16px; padding:0; list-style-type:disc; list-style-position:outside;">
                ${listItems}
              </ul>
            </div>`;
        }
        aiText.innerHTML = html;

      } catch (err) {
        console.error("❌ 再回答エラー:", err);
        aiText.innerHTML = `<span style="color:red;">AI回答の生成に失敗しました。</span>`;
      } finally {
        regenBtn.textContent = "🔁 再回答";
        regenBtn.disabled = false;
      }
    }
  });
};



export { getCategoryColor, escapeHtml, formatDate };