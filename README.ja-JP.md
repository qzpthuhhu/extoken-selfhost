# Extoken Selfhost

[English](README.md) | [简体中文](README.zh-CN.md) | 日本語 | [한국어](README.ko-KR.md) | [Español](README.es.md)

Extoken は、AI Agent 間で作業コンテキストを引き継ぐための暗号化コンテキストパッケージシステムです。

公式サイト：<https://extoken.aishangai.shop>

Extoken は、Agent がすでに理解している目標、コードベース、エラー状態、判断、次のアクションが、別の Agent、IDE、セッション、または自動化環境へ移ると失われやすい問題を解決します。作業状態を、監査可能で取得可能な Agent 可読コンテキストパッケージとしてまとめます。

## 主な機能

- **コンテキストパッケージプロトコル**：`continuation`、`workspace`、`integrity`、型付き `items` を含むバージョン化 Envelope にタスク状態を整理します。
- **Agent 間ハンドオフ**：取得コードを通じて、別の Agent が目標、判断、エラー、次の作業を引き継げます。
- **暗号化された交換**：暗号化済みペイロードを保存し、有効期限、取得回数制限、イベントログを提供します。
- **Agent 可読ドキュメント**：Web ページを解析せずに読める Markdown 形式のプロトコル文書を提供します。
- **セルフホスト対応**：React フロントエンド、NestJS バックエンド、PostgreSQL、メールログイン、API Key、OpenAPI ゲートウェイを含みます。

## 公開サイト

- Home: <https://extoken.aishangai.shop>
- Package protocol: <https://extoken.aishangai.shop/package>
- Use cases: <https://extoken.aishangai.shop/use-cases>
- Exchange records: <https://extoken.aishangai.shop/records>
- Agent Markdown doc: <https://extoken.aishangai.shop/api/extoken/package-doc>

Agent は公開プロトコル文書を直接読めます：

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

OpenAPI ゲートウェイに接続された Agent は次の形式を使えます：

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## パッケージモデル

Extoken パッケージは作業引き継ぎ用の成果物です。最小構成では次を記述します：

- パッケージタイトル、概要、プロトコルバージョン、作成時刻
- 暗号化されたコンテキストペイロード
- 取得コード、パッケージ ID、所有者 ID、有効期限、利用ポリシー
- サイズ、item 数、内容の完全性を検証する digest

より完全なパッケージには次を含められます：

- 会話メモ、未決判断、ブロッカー、次のアクション
- workspace fingerprint、プロジェクトパス、環境ヒント、依存関係メモ
- 変更ファイル、コマンド結果、ツール副作用、復旧戦略
- source Agent、target Agent、session ID、run ID、イベントログ参照

平文パスワード、長期 API Key、SMTP 認証情報、SSH 秘密鍵、Cookie、データベース接続文字列は含めるべきではありません。

## アーキテクチャ

```text
client/       React + Vite frontend
server/       NestJS API, auth, package exchange, OpenAPI gateway
shared/       Shared package protocol docs and types
scripts/      CLI and deployment helpers
docs/         Supporting project documentation
```

## 技術スタック

- Frontend: React, Vite, Tailwind CSS 4, Framer Motion
- Backend: NestJS, Express, PostgreSQL, Drizzle ORM
- Auth: bcrypt password hash, JWT access token, HttpOnly refresh cookie
- Mail: SMTP email verification codes
- Runtime: Node.js 20+, npm 10+

## ローカル開発

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

よく使うコマンド：

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
npm run test
```

## 環境変数

`.env.example` から設定を始めてください。本番環境でメール認証を使う場合は SMTP を設定します：

```env
EMAIL_CODE_SECRET=replace-with-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=replace-with-provider-password-or-app-code
SMTP_FROM="Extoken <no-reply@example.com>"
```

実際の `.env` ファイルをコミットしないでください。

## CLI

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## セキュリティ

Extoken パッケージはタスクコンテキスト用であり、認証情報の保管庫ではありません。脆弱性報告については [SECURITY.md](SECURITY.md) を参照してください。

## ライセンス

Copyright 2026 Extoken contributors. 別途ライセンスが追加されない限り、すべての権利を留保します。
