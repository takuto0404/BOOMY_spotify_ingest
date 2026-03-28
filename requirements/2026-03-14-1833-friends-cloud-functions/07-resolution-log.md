# Resolution Log

## 1. 目的
`06-requirements-spec.md` 作成後の未確定事項を解消し、実装担当へ引き渡し可能な状態にする。

## 2. 未確定事項の抽出結果
- 高: なし
- 中: なし
- 低: なし

## 3. 解決した論点

1. `users/{userId}/profile` の物理パス解釈
- 解決: `users/{userId}` ドキュメントに統一
- 根拠: Discovery Q1 = Yes

2. pending 重複判定範囲
- 解決: 双方向（A->B / B->A）を重複扱い
- 根拠: Discovery Q2 = Yes

3. 逆方向 pending の扱い
- 解決: 自動承認せず `request_exists`
- 根拠: Discovery Q3 = Yes

4. `friendRequests` の可視性
- 解決: 当事者のみ読み取り可
- 根拠: Discovery Q4 = No

5. `userName` ユニーク強制
- 解決: 今回は対象外
- 根拠: Discovery Q5 = No

6. 更新系処理の整合性制御
- 解決: send/accept/cancel/reject/remove は Transaction 必須
- 根拠: Detail Q2 = Yes

7. accept 後の request 履歴
- 解決: `accepted` として保持
- 根拠: Detail Q4 = Yes

8. Rules の範囲
- 解決: 今回仕様に含める
- 根拠: Detail Q5 = Yes

## 4. 仮定事項の検証
- 仮定事項はすべて質問で確定済み。
- 追加の仮定は残していない。

## 5. 最終状態
- 実装仕様に未解決項目なし
- 実装着手可能
- 本タスクでは実装は未着手（要件定義のみ完了）
