# Discovery Answers

## Q1
- Question: `users/{userId}/profile` は実装上 `users/{userId}` ドキュメント直下のプロフィール項目として扱ってよいか
- Answer: **Yes**

## Q2
- Question: `friendRequests` の重複判定で双方向 pending（A->B / B->A）も重複扱いにするか
- Answer: **Yes**

## Q3
- Question: 逆方向 pending がある場合でも `sendFriendRequest` は自動承認せず `request_exists` を返すか
- Answer: **Yes**

## Q4
- Question: Firestore 公開読み取りに `friendRequests` も含めるか
- Answer: **No**（`friendRequests` は当事者のみ読める想定）

## Q5
- Question: `userName` ユニーク制約を今回リリース時点で Cloud Functions 側で強制するか
- Answer: **No**
