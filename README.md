# 🌐 デジタル民主主義 POC（Proof of Concept）

**Digital Democracy POC for Okayama City**  
市民の声とAI・データをつなぐ、次世代の参加型政策プラットフォーム。

---

## 🏛 プロジェクト概要

「デジタル民主主義 POC」は、**市民が地域課題を投稿し、AIが行政資料をもとに回答・分析を行う**  
新しい形の市民参加システムです。  
岡山市をモデルケースとして開発されています。

このPoC（概念実証）は、「テクノロジーで市民と行政をつなぐ」ことを目的に、  
地図・AI・オープンデータを統合したオープンプラットフォームを目指します。

---

## 🧭 主な機能

### 🗺️ 1. 意見投稿マップ
- 市民が地図上の地点を選び、意見や提案を投稿  
- 市、区、町丁目単位でレイヤーを切り替え  
- 他の投稿への「賛同」や「返信」が可能  

### 🤖 2. AI自動回答（RAG連携）
- SupabaseとOpenAIを用いたRAG（Retrieval-Augmented Generation）構成  
- 投稿内容に関連する行政資料を自動検索し、AIが要約・回答  
- 元資料の出典も自動表示（透明性の確保）

### 📚 3. 公開行政資料データベース
- 市議会会議録・予算書・政策資料などをチャンク分割・ベクトル化して保存  
- Supabase Vector Storeを利用  
- 検索・参照・再学習に対応

### 🧩 4. サイドバー＆ポップアップUI
- 投稿一覧・AI回答を動的に表示するモダンUI  
- スマホ・PC両対応（レスポンシブ対応済み）

---

## ⚙️ 技術構成

| 分類 | 使用技術 |
|------|-----------|
| **ホスティング** | GitHub Pages（静的ファイル） |
| **データベース / 認証** | [Supabase](https://supabase.com/) |
| **AIモデル** | OpenAI GPT + text-embedding-3-small |
| **地図エンジン** | [Leaflet.js](https://leafletjs.com/) + OpenStreetMap |
| **フロントエンド** | HTML / CSS / JavaScript (ES Modules) |
| **AI回答API** | Supabase Edge Functions (Deno) |
| **バージョン管理** | Git / GitHub |

---

## 🔒 セキュリティと設計方針

- Supabaseの「anon key」を使用（公開用キー）
- OpenAI APIキーはサーバー側（Edge Function）で安全に管理
- .envファイルやService Role Keyはリポジトリに含めない
- すべての投稿・回答はSupabaseのRLS（Row-Level Security）により保護

---

## 💡 プロジェクト理念

> 「テクノロジーは市民の幸福のためにある」  
> 経済的な活動だけでなく、社会的・環境的な貢献も価値として可視化し、  
> 市民一人ひとりの声がまちづくりに反映される社会を目指します。

---

## 📄 ライセンス

このプロジェクトはオープンソースとして公開されています。  
ご利用・改変の際は適切なクレジットをお願いします。

---

### 👤 Author
**Masato Kanzaki（神﨑 雅人）**  
Digital Democracy Project / Okayama  
- [GitHub](https://github.com/kanzaki-okayama)
- [Website](https://jolly-kheer-06b4db.netlify.app/)（デモサイト）

---