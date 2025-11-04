import { addMarker } from './map.js';
import { getRegionInfo } from './map.js';

// --- 初期セットアップ ---
export function setupUI() {
  const modal = document.getElementById('postModal');
  const cancelBtn = document.getElementById('cancelBtn');
  cancelBtn.addEventListener('click', closeModal);
}

// --- モーダルを閉じて入力をリセット ---
function closeModal() {
  const modal = document.getElementById('postModal');
  modal.classList.remove('show');
  modal.hidden = true;

  document.getElementById('displayName').value = '';
  document.getElementById('content').value = '';

  const categorySelect = document.getElementById('category');
  if (categorySelect) categorySelect.value = '';

  const ageSelect = document.getElementById('age_group');
  if (ageSelect) ageSelect.value = '';

  const genderSelect = document.getElementById('gender');
  if (genderSelect) genderSelect.value = '';

  const regionLabel = document.getElementById('regionLabel');
  if (regionLabel) regionLabel.textContent = '';
}

// --- 投稿フォームを開く ---
export function openModal(latlng, supabase, map, regionInfo = null) {
  const modal = document.getElementById('postModal');
  modal.classList.add('show');
  modal.hidden = false;

  // --- 地域ラベル生成 ---
  let regionLabel = document.getElementById('regionLabel');
  if (!regionLabel) {
    regionLabel = document.createElement('div');
    regionLabel.id = 'regionLabel';
    regionLabel.style.fontSize = '13px';
    regionLabel.style.color = '#555';
    regionLabel.style.marginBottom = '6px';
    modal.querySelector('.modal-inner').insertBefore(regionLabel, modal.querySelector('label'));
  }

  // --- 初期状態 ---
  let selectedLatLng = latlng || null;
  let hasRegion = !!selectedLatLng;
  regionLabel.textContent = hasRegion
    ? `投稿先：地図上の地点 (${selectedLatLng.lat.toFixed(4)}, ${selectedLatLng.lng.toFixed(4)})`
    : '投稿先：未指定（地域を選択してください）';

  // --- 地域選択ボタン生成 ---
  let regionButtons = document.getElementById('regionButtons');
  if (!regionButtons) {
    regionButtons = document.createElement('div');
    regionButtons.id = 'regionButtons';
    regionButtons.style.marginBottom = '10px';
    regionButtons.innerHTML = `
      <button id="noRegionBtn" style="margin-right:6px;">地域指定なし</button>
      <button id="chooseRegionBtn">地図上で指定</button>
    `;
    modal.querySelector('.modal-inner').insertBefore(regionButtons, regionLabel);
  }

  // --- 地域指定なしを選択 ---
  document.getElementById('noRegionBtn').onclick = () => {
    hasRegion = false;
    selectedLatLng = null;
    regionLabel.textContent = '投稿先：地域指定なし';
    showToast('地域指定なしで投稿します');
  };

  // --- 🧭 地図上で指定を選択（字情報対応版） ---
  document.getElementById('chooseRegionBtn').onclick = () => {
    showToast('地図をクリックして地点を選択してください');

    // モーダルを一時的に閉じる
    modal.classList.remove('show');
    modal.hidden = true;

    // 一度だけクリックイベント待機
    const clickHandler = e => {
      const selectedLatLng = e.latlng;
      map.off('click', clickHandler);

      const regionInfo = getRegionInfo(selectedLatLng);
      console.log("📍 選択された字情報:", regionInfo);

      modal.classList.add('show');
      modal.hidden = false;

      if (regionInfo && (regionInfo.chome || regionInfo.ward)) {
        const parts = [regionInfo.city, regionInfo.ward, regionInfo.chome].filter(Boolean);
        regionLabel.textContent = `投稿先：${parts.join(' ')}`;
      } else {
        regionLabel.textContent = `投稿先：(${selectedLatLng.lat.toFixed(4)}, ${selectedLatLng.lng.toFixed(4)})`;
      }

      window.selectedLatLng = selectedLatLng;
      window.selectedRegionInfo = regionInfo;

      showToast('地点を選択しました');
    };

    map.on('click', clickHandler);
  };

  // --- 年代・性別入力（初回のみ） ---
  let ageSelect = document.getElementById('age_group');
  let genderSelect = document.getElementById('gender');
  if (!ageSelect && !genderSelect) {
    const inner = modal.querySelector('.modal-inner');
    const firstLabel = modal.querySelector('label');

    const ageLabel = document.createElement('label');
    ageLabel.textContent = '年代';
    ageLabel.setAttribute('for', 'age_group');

    ageSelect = document.createElement('select');
    ageSelect.id = 'age_group';
    ageSelect.required = true;
    ageSelect.style.marginBottom = '8px';
    const ageOptions = [
      '', '10代未満', '10代', '20代', '30代', '40代', '50代', '60代', '70代以上', '未回答'
    ];
    ageOptions.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a === '' ? '年代を選択してください' : a;
      ageSelect.appendChild(opt);
    });

    const genderLabel = document.createElement('label');
    genderLabel.textContent = '性別';
    genderLabel.setAttribute('for', 'gender');

    genderSelect = document.createElement('select');
    genderSelect.id = 'gender';
    genderSelect.required = true;
    genderSelect.style.marginBottom = '8px';
    const genderOptions = ['', '男性', '女性', 'その他', '未回答'];
    genderOptions.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g === '' ? '性別を選択してください' : g;
      genderSelect.appendChild(opt);
    });

    inner.insertBefore(ageLabel, firstLabel);
    inner.insertBefore(ageSelect, firstLabel);
    inner.insertBefore(genderLabel, firstLabel);
    inner.insertBefore(genderSelect, firstLabel);
  }

  // --- カテゴリ選択（初回生成） ---
  let categorySelect = document.getElementById('category');
  if (!categorySelect) {
    const label = document.createElement('label');
    label.textContent = 'カテゴリ';
    label.setAttribute('for', 'category');

    categorySelect = document.createElement('select');
    categorySelect.id = 'category';
    categorySelect.required = true;
    categorySelect.style.marginBottom = '8px';

    const categories = [
      '地域経済', '交通・道路', '子育て・教育・高齢者福祉',
      '若者支援・雇用', '医療・健康', '自然・環境',
      '防災・安全', '行政・政治改革', 'その他'
    ];

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '意見のカテゴリを選択してください';
    categorySelect.appendChild(placeholder);

    categories.forEach(c => {
      const option = document.createElement('option');
      option.value = c;
      option.textContent = c;
      categorySelect.appendChild(option);
    });

    const firstLabel = modal.querySelector('label');
    const inner = modal.querySelector('.modal-inner');
    inner.insertBefore(label, firstLabel);
    inner.insertBefore(categorySelect, firstLabel);
  }

  // --- ボタン設定 ---
  const submitBtn = document.getElementById('submitBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  submitBtn.replaceWith(submitBtn.cloneNode(true));
  cancelBtn.replaceWith(cancelBtn.cloneNode(true));

  const newSubmitBtn = document.getElementById('submitBtn');
  const newCancelBtn = document.getElementById('cancelBtn');
  newCancelBtn.onclick = closeModal;

  // --- 投稿処理 ---
  newSubmitBtn.onclick = async () => {
    const name = document.getElementById('displayName').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const category = document.getElementById('category').value;
    const age_group = document.getElementById('age_group').value || '未回答';
    const gender = document.getElementById('gender').value || '未回答';

    if (!name || !content || !category || !age_group || !gender) {
      alert('名前・年代・性別・本文・カテゴリを入力してください');
      return;
    }

    // ✅ 最新の選択地点・地域を反映
    let activeLatLng = window.selectedLatLng || latlng;
    let activeRegionInfo = window.selectedRegionInfo || regionInfo;
    let hasRegion = !!activeLatLng;

    // --- 地点未指定なら岡山市役所付近をランダム配置 ---
    if (!activeLatLng || !activeLatLng.lat || !activeLatLng.lng) {
      const baseLat = 34.6551466;   // ✅ 岡山市役所（北区大供1丁目1-1）
      const baseLng = 133.9195016;
      const jitter = () => (Math.random() - 0.5) * 0.0003; // ±約30mランダム
      activeLatLng = { lat: baseLat + jitter(), lng: baseLng + jitter() };
      console.log("📍 地域指定なし → 仮配置:", activeLatLng);
    }

    try {
      const { data: inserted, error } = await supabase
        .from('posts')
        .insert({
          lat: activeLatLng.lat,
          lng: activeLatLng.lng,
          display_name: name,
          content,
          category,
          has_region: hasRegion,
          age_group,
          gender,
          city_name: activeRegionInfo?.city || '岡山市',
          ward_name: activeRegionInfo?.ward || null,
          chome_name: activeRegionInfo?.chome || null
        })
        .select();

      if (error) throw error;

      const newPost = Array.isArray(inserted) ? inserted[0] : inserted;
      console.log("✅ 新規投稿データ:", newPost);
      showToast('✅ 投稿を送信しました！');

      // --- ピンを追加 ---
      const marker = addMarker(map, newPost, supabase);
      if (marker) {
        marker.setZIndexOffset(9999);
        marker.addTo(map);
        setTimeout(() => {
          marker.openPopup();
          map.setView([newPost.lat, newPost.lng], 14, { animate: true });
        }, 400);
      }

      // ✅ 状態リセット
      window.selectedLatLng = null;
      window.selectedRegionInfo = null;
      closeModal();

    } catch (err) {
      console.error('投稿エラー:', err);
      showToast('❌ 投稿に失敗しました', 3000);
    }
  };
}

// --- トースト通知 ---
export function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), duration);
}
