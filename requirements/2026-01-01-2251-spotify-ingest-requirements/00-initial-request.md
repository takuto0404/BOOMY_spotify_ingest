# 初期リクエスト

**日時**: 2026-01-01T22:51:40+09:00  
**リクエスト**: @[/requirements-start]

## ユーザーの状況

- **アクティブドキュメント**: `/Users/takutomaeda/BOOMY/BOOMY_spotify_ingest/src/services/firestore.ts`
- **カーソル位置**: Line 1

## プロジェクト概要

Spotify Recently Played Ingest Job - 各ユーザーの Spotify 「最近再生した曲」を毎時 Firestore に蓄積し、90日間分の履歴を保持する Node.js ワーカー

### 主要機能
- Spotify の `after` カーソルを使ったインクリメンタル取得
- `expireAt` フィールド付きの Firestore BulkWriter upsert（TTL 対応）
- ユーザーごとの取り込みメタデータ管理
- `p-queue` による並列数制御、`p-retry` による再試行
- 構造化ログ

### 技術スタック
- Node.js 20+
- TypeScript
- Firebase Admin SDK
- Express (トークンブローカー)
- Spotify Web API

## 要件収集の目的

ユーザーからの具体的な要求を収集し、プロジェクトの改善・拡張のための実装仕様書を作成する。
