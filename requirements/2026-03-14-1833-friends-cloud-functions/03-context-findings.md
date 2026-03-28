# Context Findings

## 1. 修正が必要な具体的ファイル

- `functions/src/index.ts`
  - 新規 Callable 関数エクスポート追加（`sendFriendRequest` など）
- `functions/src/types.ts`
  - 友達機能ドメイン型（Profile/Friend/FriendRequest/レスポンス型/エラーコード型）追加
- `functions/src/services/firestore.ts`
  - 既存 ingest 用処理と分離しつつ、friends ドメインの Firestore I/O 関数を追加
  - もしくは `functions/src/services/friends.ts` を新規作成して責務分離
- `functions/src/config.ts`（必要なら）
  - 今回必須の追加設定は見当たらない（リージョン固定などは既存パターンを踏襲）
- `firebase.json`
  - ルールファイル定義が未設定。`friendRequests` の当事者限定読取を実装する場合は Firestore Rules 定義が必要

## 2. 従うべき実装パターン（既存コードから検証済み）

### 2.1 Callable 関数パターン
既存パターン（`triggerUserIngest.ts`）:
1. `functions.region("asia-northeast1").runWith({...}).https.onCall(...)`
2. `context.auth` チェック
3. `context.auth.uid` を呼び出し主体として使用
4. 失敗時 `functions.https.HttpsError` を送出

### 2.2 Firestore I/O パターン
既存パターン（`services/firestore.ts`）:
1. Admin SDK を lazy initialize（`ensureInitialized`）
2. 書き込み時は `FieldValue.serverTimestamp()` を活用
3. まとまった書き込みは `BulkWriter`（ただし友達機能は transaction 優先）

### 2.3 構造化ログ
既存パターン（`lib/logging.ts`）:
- `logger.info/warn/error` を JSON 形式で出力
- 文脈情報は `context` に統一

## 3. 類似実装の分析（プロジェクト内）

### 3.1 認証あり Callable
- `functions/src/triggerUserIngest.ts`
  - `context.auth` 必須
  - UID をサーバー側で確定

### 3.2 スケジューラ実行（参考: 実行設定）
- `functions/src/scheduledIngest.ts`
  - `region/runWith` の指定方法

### 3.3 Firestore ドキュメント参照/更新
- `functions/src/services/firestore.ts`
  - `collection().doc().collection().doc()` チェーン
  - `set(..., { merge: true })`
- `functions/src/ingestTokenBroker.ts`
  - 単発 read パターン (`get`)

## 4. 技術的制約と考慮事項

- Firebase Functions は `firebase-functions` の v1 style API を使用中（プロジェクト標準）
- 既存コードに Firestore Transaction 実装は未導入
  - 友達申請・承認の整合性には transaction 導入が妥当
- Firestore ルールファイル（`firestore.rules`）がリポジトリに存在しない
  - 「公開読み取り + 書き込みは Functions のみ」のセキュリティ要件は別途ルール整備が必要
- `friendRequests` は公開読取対象外（Discovery回答 Q4=No）
  - 当事者限定読取ルールが必要

## 5. 統合ポイント

- Cloud Functions エントリ追加: `functions/src/index.ts`
- 新規 Callable 関数群:
  - `sendFriendRequest`
  - `acceptFriendRequest`
  - `cancelFriendRequest`
  - `rejectFriendRequest`
  - `removeFriend`
  - `getUserProfileById`
- Firestore コレクション:
  - `users/{userId}`（profile fields）
  - `users/{userId}/friends/{friendUserId}`
  - `friendRequests/{requestId}`

## 6. APIシグネチャと使用パターン（検証済み）

### 6.1 Functions API
- `functions.region(region: string)`
- `runWith(options: RuntimeOptions)`
- `https.onCall(handler: (data, context) => Promise<any>)`
- `https.onRequest(handler: (req, res) => Promise<void>)`
- `new functions.https.HttpsError(code, message)`

使用例:
- `functions/src/triggerUserIngest.ts`
- `functions/src/scheduledIngest.ts`
- `functions/src/ingestTokenBroker.ts`

### 6.2 Firestore Service API（既存）
- `getUsersForIngestion(): Promise<UserIngestTarget[]>`
- `getIngestMetadata(uid: string): Promise<IngestMetadata>`
- `updateIngestMetadata(uid: string, metadata: IngestMetadata): Promise<void>`
- `upsertListens(uid: string, listens: ListenSnapshot[]): Promise<void>`
- `flushWrites(): Promise<void>`

### 6.3 Ingest Job API（既存）
- `runHourlyIngest(): Promise<IngestStats>`
- `processSingleUser(user: UserIngestTarget): Promise<{ processed: number; newestPlayedAt: number }>`

### 6.4 Config API（既存）
- `getConfig(): { tokenBrokerUrl: string; userConcurrency: number; safetyWindowMs: number; spotifyPageLimit: number }`

## 7. 検証済みメソッド可用性

存在確認済み:
- `context.auth.uid` の利用（`triggerUserIngest.ts`）
- `functions.https.HttpsError`（同上）
- `FieldValue.serverTimestamp()`（`services/firestore.ts`）
- `Timestamp.fromMillis / Timestamp.fromDate`（`services/firestore.ts`）

## 8. 不明または未検証のAPI/実装アプローチ

- Firestore security rules の現行定義（リポジトリ内に未確認）
- 友達機能の既存クライアント API 契約（この repo には未配置）
- requestId の生成方針（Auto ID / deterministic key）
- トランザクション実装方式を既存サービスファイルに統合するか、新規 `friends` サービスに分離するか

## 9. 今回要件への確定解釈（Discovery回答反映）

- `users/{userId}/profile` は物理的には `users/{userId}` として保持
- pending 重複判定は双方向を含む
- 逆方向 pending があっても自動承認せず `request_exists`
- `friendRequests` は公開読取しない（当事者限定）
- `userName` ユニーク強制は今回スコープ外
