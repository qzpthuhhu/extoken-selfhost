# Extoken Selfhost

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md) | 한국어 | [Español](README.es.md)

Extoken은 AI Agent 간 작업 컨텍스트를 인계하기 위한 암호화된 컨텍스트 패키지 시스템입니다.

공식 사이트: <https://extoken.aishangai.shop>

Extoken은 Agent가 이미 이해한 목표, 코드베이스, 오류 상태, 의사결정, 다음 작업이 다른 Agent, IDE, 세션 또는 자동화 환경으로 이동할 때 쉽게 사라지는 문제를 해결합니다. 작업 상태를 감사 가능하고, 수령 가능하며, Agent가 읽을 수 있는 컨텍스트 패키지로 묶습니다.

## 주요 기능

- **컨텍스트 패키지 프로토콜**: `continuation`, `workspace`, `integrity`, typed `items`를 포함한 버전 관리 Envelope로 작업 상태를 정리합니다.
- **Agent 간 핸드오프**: 수령 코드를 통해 다른 Agent가 목표, 결정, 오류, 다음 작업을 이어받을 수 있습니다.
- **암호화된 교환**: 암호화된 패키지 payload를 저장하고 만료 시간, 수령 횟수 제한, 이벤트 로그를 제공합니다.
- **Agent가 읽을 수 있는 문서**: 웹 페이지 DOM을 파싱하지 않아도 되는 Markdown 프로토콜 문서를 제공합니다.
- **셀프호스팅 가능**: React 프론트엔드, NestJS 백엔드, PostgreSQL, 이메일 로그인, API Key, OpenAPI 게이트웨이를 포함합니다.

## 공개 사이트

- Home: <https://extoken.aishangai.shop>
- Package protocol: <https://extoken.aishangai.shop/package>
- Use cases: <https://extoken.aishangai.shop/use-cases>
- Exchange records: <https://extoken.aishangai.shop/records>
- Agent Markdown doc: <https://extoken.aishangai.shop/api/extoken/package-doc>

Agent는 공개 프로토콜 문서를 직접 읽을 수 있습니다:

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

OpenAPI 게이트웨이에 연결된 Agent는 다음 형식을 사용할 수 있습니다:

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## 패키지 모델

Extoken 패키지는 작업 인계용 산출물입니다. 최소 구성은 다음을 설명해야 합니다:

- 패키지 제목, 요약, 프로토콜 버전, 생성 시간
- 암호화된 컨텍스트 payload
- 수령 코드, 패키지 ID, 소유자 ID, 만료 시간, 사용 정책
- 크기, item 수, 내용 무결성을 확인하기 위한 digest

더 풍부한 패키지는 다음을 포함할 수 있습니다:

- 대화 메모, 미해결 결정, blocker, 다음 작업
- workspace fingerprint, 프로젝트 경로, 환경 힌트, 의존성 메모
- 변경 파일, 명령 결과, 도구 부작용, 복구 전략
- source Agent, target Agent, session ID, run ID, 이벤트 로그 참조

평문 비밀번호, 장기 API Key, SMTP 인증 정보, SSH 개인키, Cookie, 데이터베이스 연결 문자열은 포함하지 않아야 합니다.

## 아키텍처

```text
client/       React + Vite frontend
server/       NestJS API, auth, package exchange, OpenAPI gateway
shared/       Shared package protocol docs and types
scripts/      CLI and deployment helpers
docs/         Supporting project documentation
```

## 기술 스택

- Frontend: React, Vite, Tailwind CSS 4, Framer Motion
- Backend: NestJS, Express, PostgreSQL, Drizzle ORM
- Auth: bcrypt password hash, JWT access token, HttpOnly refresh cookie
- Mail: SMTP email verification codes
- Runtime: Node.js 20+, npm 10+

## 로컬 개발

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

자주 쓰는 명령:

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
npm run test
```

## 환경 변수

`.env.example`에서 시작하세요. 프로덕션 이메일 인증을 사용하려면 SMTP를 설정해야 합니다:

```env
EMAIL_CODE_SECRET=replace-with-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=replace-with-provider-password-or-app-code
SMTP_FROM="Extoken <no-reply@example.com>"
```

실제 `.env` 파일은 커밋하지 마세요.

## CLI

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## 보안

Extoken 패키지는 작업 컨텍스트를 위한 것이며 인증 정보 저장소가 아닙니다. 보안 문제 보고는 [SECURITY.md](SECURITY.md)를 참고하세요.

## 라이선스

Copyright 2026 Extoken contributors. 별도 라이선스가 추가되지 않는 한 모든 권리를 보유합니다.
