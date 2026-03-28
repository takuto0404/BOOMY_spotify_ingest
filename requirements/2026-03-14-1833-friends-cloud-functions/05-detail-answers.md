# Detail Answers

## Q1
- Question: `requestId` は Firestore Auto ID でよいか
- Answer: **Yes**

## Q2
- Question: 更新系関数（send/accept/cancel/reject/remove）はすべて Firestore Transaction 必須にするか
- Answer: **Yes**

## Q3
- Question: `removeFriend` 時の `friendRequests` `canceled` 更新対象を `pending` と `accepted` 両方にするか
- Answer: **Yes**

## Q4
- Question: `accept` 後の `friendRequests` を `accepted` として保持するか
- Answer: **Yes**

## Q5
- Question: Firestore Rules（公開読み取り・書き込み禁止・`friendRequests`当事者限定読取）を今回範囲に含めるか
- Answer: **Yes**
