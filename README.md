# Spotify Recently Played Ingest Job

各ユーザーの Spotify 「最近再生した曲」を毎時 Firestore に蓄積し、90日間分の履歴を保持する Node.js ワーカーです。Spotify の 50 件制限を上回る履歴を安全かつ冪等に永続化することを目的としています。

## 特徴

- Spotify の `after` カーソルを使ったインクリメンタル取得
- `expireAt` フィールド付きの Firestore BulkWriter upsert（TTL 対応）
- ユーザーごとの取り込みメタデータ `users/{uid}/meta/ingest`
- `p-queue` による並列数制御、`p-retry` による再試行、構造化ログ
- GitHub Actions / Cloud Run どちらにも展開しやすいスケルトン構成

## ディレクトリ構成

```
src/
  index.ts            # Firestore 初期化 & ジョブ実行のエントリポイント
  token-broker.ts     # リフレッシュトークン→アクセストークン変換用 Express ハンドラ
  jobs/ingest.ts      # 1 回の取り込みサイクルをオーケストレーション
  services/
    firestore.ts      # Firestore へのアクセス, BulkWriter ヘルパー, メタデータ
    spotify.ts        # 最近再生 API のページ取得
    token.ts          # トークンブローカー呼び出し
  lib/
    rate-limit.ts     # p-queue 設定ユーティリティ
    logging.ts        # 構造化ログラッパー
  types.ts            # リッスンデータや Spotify レスポンスの型
```

## 必要要件

- Node.js 20 以上
- `expireAt` に TTL が設定された Firestore プロジェクト
- Spotify リフレッシュトークンをアクセストークンに交換するトークンブローカー（本リポジトリに同梱された Express 実装を利用可能）

## 環境変数

`.env.example` を `.env` にコピーし、下記を設定してください。

| 変数名 | 説明 |
| --- | --- |
| `TOKEN_BROKER_URL` | `uid` を渡すとアクセストークンを返すエンドポイント URL |
| `DEFAULT_USER_CONCURRENCY` | ユーザー並列数（デフォルト 5） |
| `SAFETY_WINDOW_MINUTES` | `lastFetchedAt` から巻き戻す安全マージン（分） |
| `GOOGLE_APPLICATION_CREDENTIALS` | (ローカル) Firestore 用サービスアカウント JSON のパス |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | トークンブローカーが使用する Spotify アプリ資格情報 |
| `SPOTIFY_REFRESH_TOKENS_JSON` | `{ "uid": "refresh_token" }` 形式の JSON 文字列 |
| `TOKEN_BROKER_PORT` | ローカルブローカーのポート（デフォルト 3000） |

Cloud Run などにデプロイする際は Workload Identity を使い、秘密鍵ファイルを配置しない運用がおすすめです。

## 利用可能な npm スクリプト

## 利用可能な npm スクリプト
- `npm run deploy` – Cloud Functions をデプロイ
- `npm run serve:functions` – ローカルエミュレータで関数を実行
- `npm run lint` – `tsc --noEmit` で型チェック



## 全体フロー

1. Firebase Admin SDK と BulkWriter を初期化。
2. 取り込み対象ユーザーを列挙（現状はダミー実装）。
3. 各ユーザーについて（p-queue で並列制御）:
   - 取り込みメタデータを読み、安全マージン付きで `after` カーソルを算出。
   - トークンブローカーからアクセストークンを取得。
   - Spotify 最近再生 API をページングし、データがなくなるまで取得。
   - `users/{uid}/listens/{playedAtMs}_{trackId}` に必要最小限のスナップショットを upsert。
   - 最新 `playedAtMs` や処理件数、エラーをメタドキュメントに書き戻し。
4. 処理ユーザー数、件数、最新カーソル、エラー数などを構造化ログで出力。

## Cloud Functions デプロイ

このプロジェクトは Cloud Functions + Cloud Scheduler による定期実行にも対応しています。

### セットアップ

1. **Firebase プロジェクトの初期化**:
   ```bash
   firebase login
   firebase init
   # Functionsを選択し、既存のプロジェクトを使用
   ```

2. **環境変数の設定**:
   ```bash
   # functions/.env ファイルを作成
   cp functions/.env.example functions/.env
   # 必要な環境変数を設定
   ```

3. **ビルドとデプロイ**:
   ```bash
   npm run deploy
   ```

### 利用可能な関数

#### `scheduledIngest`
- **トリガー**: Cloud Scheduler (1時間ごと)
- **タイムゾーン**: Asia/Tokyo
- **機能**: 全ユーザーのSpotifyインジェストを自動実行
- **タイムアウト**: 9分
- **メモリ**: 512MB

デプロイ後、Google Cloud Console の Cloud Scheduler でスケジュールを確認できます。

#### `triggerUserIngest`
- **トリガー**: 呼び出し可能 HTTPS 関数
- **認証**: 必須(Firebase Authentication)
- **機能**: 認証済みユーザーが自分のデータを手動でインジェスト
- **タイムアウト**: 60秒
- **メモリ**: 256MB

**クライアントからの呼び出し例**:
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const triggerIngest = httpsCallable(functions, 'triggerUserIngest');

// 自分のデータをインジェスト
const result = await triggerIngest();
console.log(result.data); // { success: true, message: "...", processed: 10 }
```

### ログの確認

```bash
# リアルタイムログ
firebase functions:log

# 特定の関数のログ
firebase functions:log --only scheduledIngest
```

### ローカルテスト

```bash
# エミュレータで実行
npm run serve:functions

# 別のターミナルで関数を呼び出し
firebase functions:shell
> triggerUserIngest({ auth: { uid: 'test-user-id' } })
```

## 次のステップ

- Firestore 上でのユーザー列挙ロジック(クエリやインデックス)を実装
- GitHub Actions の cron による定期実行設定(Cloud Functions の代替として)
- エラー検知や通知の監視基盤を整備
- トークンブローカーを Cloud Run / Cloud Functions にデプロイし、`TOKEN_BROKER_URL` を更新

このリポジトリは上記要件を段階的に満たせるようスケルトンとして構築されています。必要に応じて各モジュールを拡張し、本番運用へ向けた設定と検証を進めてください。
