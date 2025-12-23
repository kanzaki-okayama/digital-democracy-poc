# 議会発言の価値軸抽出システム 設計仕様書兼ロードマップ (Unified Design Document)

## 1. プロジェクト概要 (Project Overview)
本プロジェクトは、地方議会（例：岡山市議会）の膨大な議事録データを解析・可視化し、市民が「どの事業が、どのような価値観に基づいて議論されているか」を直感的に理解できるデジタル民主主義プラットフォーム（PoC: Proof of Concept）を構築することを目的とする。
単なる「議事録検索」ではなく、**「価値の可視化（Value Landscape）」** を通じて、市民の市政への関心と理解を深め、最終的には市民参加型のプラットフォームを目指す。

## 2. システムの目的 (Objectives)
- **非構造化データの構造化**: テキスト形式の議事録を、計算可能な構造化グラフレコード（ナレッジグラフ）に変換する。
- **価値の可視化**: 「事業」を中心とした「行政（提案）」と「議員（評価）」の構造、そしてその背後にある「価値観（効率性、公平性など）」を可視化する。
- **市民エンゲージメント**: 市民が自ら議論の構造を探索し、新たな解決策を提案できる基盤を作る。

## 3. データモデル（グラフスキーマ） (Data Model)
本システムでは、以下の概念モデルに基づいてデータを構築する。Neo4j等のグラフデータベースでの実装を想定。

### 3.1 ノード（Node）
| ノード種別 | 説明 | 例 |
| :--- | :--- | :--- |
| **Project** (事業/議案) | 議論の対象。予算案、条例、事業計画など。 | アリーナ整備事業, 甲第142号議案 |
| **Councilor** (議員) | 発言を行っている議員個人。 | 東議員, 高成議員 |
| **Authority** (当局) | 事業を提案・説明する主体（市長、局長等）。行政全体として1つのノードに集約する場合もある。 | 岡山市, 財政局長 |
| **Opinion** (意見) | 議員が表明した賛否や定性的な評価。多次元の価値スコアを持つ。 | 反対, 再考を求める, 懸念 |
| **ValueAxis** (価値軸) | 議論の方向性を位置付ける概念的なアンカー。（可視化上の仮想ノード） | 経済・効率, 公正・公平, 安全・安心... |

### 3.2 エッジ（Edge）
1. **PROPOSES (Authority → Project)**: 当局が事業を提案する。
2. **EXPRESSES (Councilor → Opinion)**: 議員が意見を表明する。
3. **TARGETS (Opinion → Project)**: 意見が特定の事業を対象としている。
4. **BASED_ON (Opinion → ValueAxis)**: 意見が特定の価値観に基づいている（※可視化時はスコアに基づく引力として表現）。

---

## 4. 可視化コンセプト: "Value Arena" (Visualization)
市民が直感的に市政の全体像を把握できるインターフェース。

### 4.1 アリーナ構造
- **6つの価値軸**: 画面外周に「経済・効率」「公正・公平」「成長・革新」「伝統・安定」「安全・安心」「持続可能性」を配置。
- **事業の配置**: Projectノードは、紐づくOpinionの価値スコアの総和（重心）によって、アリーナ内を浮遊する。
- **意見の展開**: Projectをダブルクリックまたは選択することで、その周囲に関連するOpinionノードが展開される（Drill-down）。

### 4.2 インタラクション
- **Double Click**: ノードを展開（Expand）または折り畳み（Collapse）。
  - **Project展開**: 関連する全意見（Opinion）が表示され、ビューが自動的にフォーカスされる。
  - **Speaker（議員/当局）展開**: その人物の全発言を表示。コンテキスト維持のため、発言が参照しているProjectも芋づる式に自動展開される。
- **Reset View**: ワンクリックで全ての展開、検索フィルタを解除し、初期のカメラ位置に戻る。
- **Filter/Search**: 表示する事業数のスライド変更、キーワードによるリアルタイム絞り込み。
- **Data Aggregation**: Speaker/Projectノードの価値スコアおよびメタデータ（会議名等）は、配下の発言群から動的に集計される。

---

## 5. 機能要件と実装プロセス (Implementation)

### 5.1 データ前処理 (Data Preprocessing)
- 入力: `minutes` ディレクトリ内のCSVファイル群。
- 処理:
  - ファイル名からメタデータ（会議ID、日付）抽出。
  - 発言者名の正規化。
  - 形式的な発言のフィルタリング。

### 5.2 構造抽出 (Extraction) - `analyze_values.py` 等
- **技術**: OpenAI Batch API (gpt-4o-mini / gpt-4o)
- **処理**:
  - 各発言を解析し、`Project` - `Opinion` - `Reasoning` の構造を抽出。
  - **多次元価値採点**: 各Opinionに対し、6つの価値軸それぞれについて 0〜10 のスコアを付与する。
  - **名寄せ**: 表記揺れ（「アリーナ」「新アリーナ」）を正規化し、同一エンティティとして扱う。

### 5.3 グラフ構築・統合 (Graph Construction) - `merge_graph_data.py`
- JSONL形式の抽出結果を統合。
- ノードのユニークID生成（Type:Labelのハッシュ等）による名寄せ。
- 「類似意見の統合」: ベクトル類似度（Embedding）を用い、酷似した意見ノードを統合してグラフを簡素化するコンソリデーション処理。

### 5.4 埋め込み可視化 (Embedded Visualization) - `embed_data_final.py`
- CORS制約を回避し、サーバレスで配布・閲覧可能にするため、抽出データをBase64エンコードしてHTMLファイル内に直接埋め込む手法を採用（PoC段階）。

---

## 6. ロードマップ (Roadmap)

### Phase 1: データ品質の向上とPoC完成（完了）
- [x] 多次元価値スコアリングの実装とBatch Processing。
- [x] サーバーレス（埋め込み）HTMLの生成。
- [x] **名寄せ・統合の集大成**: 類似意見の統合ロジック（`consolidate_nodes_semantic.py`）の実装と、統合ノードにおけるメタデータ（全発言者の保持）の多重化。
- [x] **プロジェクトスコアの自動集計**: 個別の意見からプロジェクト単位の価値重心を自動算出するパイプラインの構築。
- [x] **UI/UXの高度化**: 
    - ダブルクリックによる展開・折り畳み。
    - 展開時の自動フォーカスとアニメーション。
    - サイドパネルでの価値プロファイル（棒グラフ）表示。
    - 物理演算の最適化（ゴーストドラッグ問題の解消）。
    - 価値スコア未抽出時のフォールバック案内。
- [x] **データ欠損の補完**: 発言者情報の欠落を自動検知・補完するロジックの実装。

### Phase 2: UI/UXのさらなる洗練と共有機能（進行中）
- **スマートフォン対応**: モバイル（縦長画面）でも操作しやすいUI設計（カード型リスト＋簡易グラフ）。
- **詳細パネル強化**: より詳細なAI要約、関連する議論の推薦。
- **共有機能**: 特定の視点（例：「環境重視の事業一覧」）をURLパラメーターで共有可能にする。
- **多言語対応**: インバウンドや外国人居住者向けに、多言語での価値軸解説。

### Phase 3: システム基盤の移行（2ヶ月～）
- **Neo4j導入**: JSONファイルベースから、本格的なGraph DB (Neo4j) への移行。
- **Backend API**: FastAPI等によるオンデマンドなデータ配信サーバーの構築（全データロードの廃止）。
- **自動化**: 議事録更新を検知して自動解析するパイプライン（Airflow等）の構築。

### 6.2 データモデルの拡張
- **動的集計スコア**: ProjectおよびSpeakerノードは、紐づく全Opinionの平均値としての価値軸スコア（`values`）を保持する。
- **メタデータ多重化**: 各ノードは、元となる発言データから集約された会議名、日付のリスト（`metadata`）を保持し、サイドパネルでの一括表示を可能にする。

## 7. 技術スタック (Tech Stack)
- **Language**: Python 3.x
- **Extract/Analyze**: OpenAI API (Batch), LangChain (Optional), scikit-learn (Clustering)
- **Visualization**: Vis.js (Current PoC), React Force Graph / Sigma.js (Future)
- **Database**: Neo4j (Future)
- **Frontend**: Vanilla JS (PoC), React/Next.js (Future)

## 8. リスクと対策
- **ハルシネーション**: LLMによる誤分類。対策として「Reasoning（根拠）」を常にUIに表示し、ユーザーが検証可能にする。
- **パフォーマンス**: データ増大によるブラウザクラッシュ。対策としてPhase 3でのDB移行とAPI化を計画。

---

## 9. 実装ファイル構成と実験履歴 (File Structure & History)

### 9.1 コア・パイプライン (Core Pipeline)
本番環境に向けたデータ構築・可視化の正規フローを構成するファイル群。

1.  **データ抽出 (Extraction)**:
    *   `analyze_values.py`: 議事録から「事業・意見・背景価値（多次元）」を抽出するためのBatch Request生成スクリプト。
    *   `batch_input_values.jsonl`: 生成されたBatch Requestデータ。
    *   `retrieve_batch_result.py`: OpenAI Batch APIの結果を取得し、`value_map.json` を生成する。

2.  **グラフ統合 (Merging)**:
    *   `merge_graph_data.py`: 分散したJSONLファイル（`graph_data/`）を `merged_graph.json` に統合。

3.  **データ補正 (Refining & Repairing)**:
    *   `refine_graph_data.py`: 不要ノード（議長、挨拶、1文字ゴミ等）の削除と行政ノードの正規化。出力: `merged_graph_refined.json`。
    *   `repair_graph_speaker_links.py`: 意見ノード（Opinion）の発言者プロパティを確認し、リンク切れしている発言者（Source）とのエッジを修復・再生成する。出力: `merged_graph_repaired.json`。

4.  **正規化・統合 (Normalization & Consolidation)**:
    *   `consolidate_nodes_semantic.py`: 類似した意見ノードをベクトル類似度で統合し、グラフを簡略化する。出力: `merged_graph_consolidated.json`。
    *   `normalize_projects.py`: 事業名の表記揺れ（「アリーナ」「新アリーナ」）や議案名（「甲第X号」）を正規化する。出力: `merged_graph_normalized.json`。

4.  **可視化生成 (Visualization Embedding)**:
    *   `network_visualization_values.html`: 可視化用テンプレートHTML。
    *   `embed_data_final.py`: グラフデータとValue MapをBase64エンコードし、テンプレートに埋め込んで単独動作可能なHTMLを生成する。出力: `network_visualization_values_embedded.html`。

### 9.2 実験・旧ファイル (Experimental / Deprecated)
開発過程で使用したが、現在は非推奨または参考目的のファイル。

*   **旧可視化スクリプト**:
    *   `visualize_network_lite.py`: PyVisを用いた簡易可視化（初期PoC）。
    *   `visualize_network_arena_clustered.py`, `visualize_network_arena_semantic.py`: レイアウト実験用。
    *   `embed_data_to_html.py`, `embed_data_to_html_safe.py`: `embed_data_final.py` の前身。
*   **分析・検証スクリプト**:
    *   `analyze_direct_edges.py`, `analyze_orphan_source.py`: グラフ構造の不整合調査用。
    *   `clean_minutes_data.py`: 当初のCSVクリーニング用（現在は抽出プロセスに統合）。
    *   `analyze_project_names.py`, `check_project_values.py`: データ品質の確認用（一回限りの利用に近い）。

---

## 10. データ処理レイヤー構造 (Data Processing Layers)
元データから最終的な価値軸マップに至るまでのデータの階層構造。

### Layer 1: Raw Data (非構造化データ)
- **ソース**: 議事録CSV (`minutes/*.csv`)
- **内容**: 会議名、日付、発言者、発言テキスト全文。

### Layer 2: Entity Graph (抽出された事実)
- **生成**: `extract_graph_data.py` / `analyze_values.py`
- **ノード**:
  - `Councilor` (議員)
  - `Authority` (行政答弁者)
  - `Project` (事業・議案) - *正規化前*
  - `Opinion` (個別の発言要旨) - *統合前*
- **エッジ**: `EXPRESSES`, `TARGETS`, `PROPOSES`

### Layer 3: Semantic & Normalized (意味的・正規化レイヤー)
- **生成**: `normalize_projects.py`, `consolidate_nodes_semantic.py`
- **処理内容**:
  - **名寄せ (Project Normalization)**: 「アリーナ」「新アリーナ」などの表記揺れを `Project:新アリーナ整備事業` に統一。
  - **意見統合 (Opinion Consolidation)**: ベクトル類似度が高い `Opinion` ノードを集約し、重複を排除。
  - **価値スコアリング (Value Scoring)**: 
    - 各 `Opinion` に6次元の価値ベクトル (`Economic`, `Fairness`...) を付与。
    - 各 `Project` ノードに対しても、紐づく全意見の平均ベクトルを算出し付与。これにより事業単位の重心を決定。

### Layer 4: Visualization / Value Layer (可視化・価値レイヤー)
- **生成**: `network_visualization_values.html` (Runtime / Browser)
- **要素**:
  - **Value Axis (価値軸)**: 画面上に配置される6つの仮想ノード（アンカー）。これらはJSONデータ内には静的ノードとして存在せず、描画エンジンが座標として定義する。
  - **引力関係 (Gravity)**: `Project` ノードは、Layer 3で算出されたスコアに基づき、Layer 4の `Value Axis` へと物理的に引き寄せられる（`BASED_ON` 擬似エッジの効果）。



## 11. Visualization Technical Details (Vis.js Configuration)

### 11.1 Value Landscape Positioning Strategy
"Value Landscape"モードでは、プロジェクトノードを6つの価値軸に向かって配置する際、単なる物理演算（バネ）ではなく、**数学的な重心計算（Mathematical Centroid）**を組み合わせて使用する。

1.  **数学的重心の算出 (Center of Mass)**:
    各プロジェクトノードの初期座標は、紐づく意見の価値スコアを重みとした重心計算によって決定される。
    *   `TargetX = Σ(AxisNode.X * AxisScore) / Σ(AxisScore)`
    *   `TargetY = Σ(AxisNode.Y * AxisScore) / Σ(AxisScore)`
    これにより、プロジェクトは自身の最も高いスコアを持つ価値軸の方向へ正確に移動する。

2.  **ハイブリッド・フィジックス**:
    数学的に決定された座標を基点としつつ、ノード同士の重なりを回避するために微弱な物理演算を併用する。
    *   **Solver**: `barnesHut`
    *   **Central Gravity**: `0.0` (中央への引力を無効化し、重心位置を維持)
    *   **Gravitational Constant**: `-600` (Value Map) / `-25000` (Standard)
    *   **Avoid Overlap**: `1.0`
    *   **Damping**: `0.7` (Value Map) / `0.09` (Standard)

