# Discovery Questions (Yes/No)

## Q1: `users/{userId}/profile` は「`users/{userId}` ドキュメント直下のフィールド群」として実装して問題ないですか？
**不明な場合のデフォルト:** はい（Firestore の正規パス整合性を優先し、`users/{userId}` に `userId/userName/displayName/createdAt/updatedAt` を保持）
**依存関係:** データモデル定義、`getUserProfileById` の参照パス、将来の `userName` 検索インデックス設計
**次のステップへの影響:** プロファイル保存先を早期確定しないと全 Callable の実装とテストがブレる

## Q2: `friendRequests` の重複判定は「同一ペアの双方向 pending（A->B と B->A）を重複」とみなしますか？
**不明な場合のデフォルト:** はい（同一2ユーザー間に pending は常に1件に制限）
**依存関係:** `sendFriendRequest` のクエリ条件、`request_exists` の返却条件
**次のステップへの影響:** DB クエリ設計とトランザクション条件の定義が確定する

## Q3: 逆方向 pending（B->A）が存在するとき、`sendFriendRequest`（A->B）は自動承認にせず `request_exists` を返す仕様でよいですか？
**不明な場合のデフォルト:** はい（仕様の単純性と状態遷移の明確性を優先）
**依存関係:** `sendFriendRequest` と `acceptFriendRequest` の責務分離
**次のステップへの影響:** クライアント側の UX（「承認」操作を明示的に要求するか）が確定する

## Q4: Firestore 公開読み取りは `friendRequests` も含めて許可する方針ですか？
**不明な場合のデフォルト:** いいえ（`friendRequests` は当事者のみ読めるルールを推奨）
**依存関係:** Firestore セキュリティルール、個人情報/関係情報の露出範囲
**次のステップへの影響:** ルール設計とクライアントクエリ方法が変わる

## Q5: `userName` のユニーク制約は今回リリース時点で Cloud Functions 側で強制しますか？
**不明な場合のデフォルト:** いいえ（今回スコープは ID 検索のみで、将来対応に分離）
**依存関係:** ユーザープロファイル更新 API、補助コレクション/予約ロジック設計
**次のステップへの影響:** 今回の実装範囲と移行計画（後方互換性）が確定する
