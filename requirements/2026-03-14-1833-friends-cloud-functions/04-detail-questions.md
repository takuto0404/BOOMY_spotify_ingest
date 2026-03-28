# Detail Questions (Yes/No)

## Q1: `friendRequests/{requestId}` は Firestore Auto ID（`collection.add` / `doc()`）で採番してよいですか？
**不明な場合のデフォルト:** はい（衝突回避と実装単純化を優先）
**実装への影響:** `sendFriendRequest` の返却 `requestId` 生成方式が確定
**リスク:** 将来、同一ペア deterministic key が必要になる場合は移行が必要

## Q2: 友達関連の全更新系関数（send/accept/cancel/reject/remove）は Firestore Transaction を必須にしますか？
**不明な場合のデフォルト:** はい（同時実行時の整合性を優先）
**実装への影響:** `already_friends` / `request_exists` 判定と書き込みを原子的に実施
**リスク:** トランザクション設計を誤るとリトライ頻発

## Q3: `removeFriend` 時の「既存 friendRequests を canceled 更新」は、`pending` と `accepted` の両方を対象にしますか？
**不明な場合のデフォルト:** はい（関係解消後に active 状態が残らないようにする）
**実装への影響:** 双方向クエリ + 条件付き更新ロジックが必要
**リスク:** 過去 request の履歴要件と衝突する可能性

## Q4: `acceptFriendRequest` 後、`friendRequests` の `accepted` ドキュメントは履歴として保持し続けますか？
**不明な場合のデフォルト:** はい（仕様に `accepted` 状態が含まれるため保持）
**実装への影響:** `reject` のみ削除、`cancel/accept` は更新という運用が確定
**リスク:** データ量増加（ただし通常は軽微）

## Q5: Firestore Rules（公開読み取り・書き込み禁止・friendRequests当事者限定読取）をこの実装仕様の範囲に含めますか？
**不明な場合のデフォルト:** はい（Cloud Functions API仕様とアクセス制御を同時に固定するため）
**実装への影響:** `firestore.rules` と `firebase.json` の明示的な更新手順を仕様に追加
**リスク:** ルール反映漏れがあるとセキュリティ要件未達
