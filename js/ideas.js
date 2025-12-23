/**
 * js/ideas.js
 * 課題解決アイデア（掲示板）のロジック
 */

export async function initIdeasBoard(supabase) {
    const board = document.getElementById('ideasBoard');
    if (!board) return;

    // サンプルデータ（将来的にSupabaseの 'ideas' テーブルから取得するように拡張可能）
    const sampleIdeas = [
        {
            id: 1,
            title: 'スマート・モビリティ・ハブ',
            category: '交通・道路',
            description: '主要駅周辺に、電動シェアサイクル、カーシェア、デマンドバスが統合された次世代型ハブを設置。ラストワンマイルの課題を解消し、高齢者の外出を支援します。',
            votes: 124,
            author: '岡山未来デザインLab',
            image: 'https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=400&q=80',
            status: '検討中'
        },
        {
            id: 2,
            title: '廃校を活用したデジタル・ラーニング・センター',
            category: '子育て・教育',
            description: '少子化で閉校となった小学校を、地域の全世代が学べるデジタル教育拠点に転換。プログラミング教室やコワーキングスペースを併設します。',
            votes: 89,
            author: '教育の未来を考える会',
            image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=400&q=80',
            status: '進行中'
        },
        {
            id: 3,
            title: 'グリーン・ルーフ・イニシアチブ',
            category: '自然・環境',
            description: '市内の公共施設や商業ビルの屋上を緑化。断熱効果による省エネと、都市部のヒートアイランド現象の抑制、都市養蜂などへの活用を目指します。',
            votes: 215,
            author: 'おかやま緑の街づくり',
            image: 'https://images.unsplash.com/photo-1530629013299-6cb10d168419?auto=format&fit=crop&w=400&q=80',
            status: '提案済'
        },
        {
            id: 4,
            title: '地域通貨「OKAYAMAコイン」',
            category: '地域経済',
            description: 'ボランティア活動や地産地消の購入に対して付与されるデジタル地域通貨。地元商店街でのみ使用可能にすることで、経済の域内循環を促進します。',
            votes: 156,
            author: '商店街活性化プロジェクト',
            image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e1c?auto=format&fit=crop&w=400&q=80',
            status: '実験中'
        }
    ];

    renderIdeas(sampleIdeas);

    function renderIdeas(ideas) {
        board.innerHTML = '';
        ideas.forEach(idea => {
            const card = document.createElement('div');
            card.className = 'idea-card';
            card.innerHTML = `
        <div class="idea-image" style="background-image: url('${idea.image}')">
          <span class="idea-status">${idea.status}</span>
        </div>
        <div class="idea-content">
          <div class="idea-header">
            <span class="idea-categoryTag">${idea.category}</span>
            <div class="idea-votes">
              <i class="fa-solid fa-arrow-up"></i> ${idea.votes}
            </div>
          </div>
          <h3 class="idea-title">${idea.title}</h3>
          <p class="idea-description">${idea.description}</p>
          <div class="idea-footer">
            <span class="idea-author">by ${idea.author}</span>
            <button class="btn-vote" data-id="${idea.id}">
              <i class="fa-regular fa-thumbs-up"></i> 賛同する
            </button>
          </div>
        </div>
      `;
            board.appendChild(card);
        });

        // 投票ボタンのイベントリスナー
        const voteButtons = board.querySelectorAll('.btn-vote');
        voteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const icon = e.currentTarget.querySelector('i');
                if (icon.classList.contains('fa-regular')) {
                    icon.classList.replace('fa-regular', 'fa-solid');
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.innerHTML = `<i class="fa-solid fa-thumbs-up"></i> 賛同しました`;
                }
            });
        });
    }
}
