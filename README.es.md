# Extoken Selfhost

[English](README.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja-JP.md) | [한국어](README.ko-KR.md) | Español

Extoken es un sistema de paquetes de contexto cifrados para transferir trabajo entre agentes de IA.

Sitio oficial: <https://extoken.aishangai.shop>

Extoken resuelve un problema concreto de flujo de trabajo: un Agent puede haber entendido el objetivo, el código, el estado de error, las decisiones y las siguientes acciones, pero ese contexto suele perderse cuando el trabajo pasa a otro Agent, IDE, sesión o entorno de automatización. Extoken empaqueta ese estado en un paquete de contexto auditable, recuperable y legible por agentes.

## Qué hace

- **Protocolo de paquetes de contexto**: organiza el estado de una tarea en un Envelope versionado con `continuation`, `workspace`, `integrity` e `items` tipados.
- **Handoff entre agentes**: permite transferir contexto mediante códigos de recogida para que otro Agent continúe con el mismo objetivo, decisiones, errores y acciones siguientes.
- **Intercambio cifrado**: almacena payloads cifrados y aplica caducidad, límites de recogida y logs de eventos.
- **Documentación legible por agentes**: expone el protocolo en Markdown para que los agentes no tengan que parsear una página web.
- **Aplicación self-hostable**: incluye frontend React, backend NestJS, PostgreSQL, login por email, API keys y endpoints de gateway OpenAPI.

## Sitio en vivo

- Home: <https://extoken.aishangai.shop>
- Package protocol: <https://extoken.aishangai.shop/package>
- Use cases: <https://extoken.aishangai.shop/use-cases>
- Exchange records: <https://extoken.aishangai.shop/records>
- Agent Markdown doc: <https://extoken.aishangai.shop/api/extoken/package-doc>

Los agentes pueden leer el documento público del protocolo directamente:

```bash
curl -L https://extoken.aishangai.shop/api/extoken/package-doc
```

Los agentes integrados con el gateway OpenAPI pueden usar:

```bash
curl -L \
  -H "Authorization: Bearer <PUBLIC_OPENAPI_GATEWAY_TOKEN>" \
  https://extoken.aishangai.shop/openapi/extoken/package-doc
```

## Modelo de paquete

Un paquete Extoken es un artefacto de handoff. Como mínimo debe describir:

- título, resumen, versión del protocolo y hora de creación
- payload de contexto cifrado
- código de recogida, ID del paquete, ID del propietario, caducidad y política de uso
- digest de integridad para tamaño, número de items y completitud del contenido

Un paquete más completo puede incluir:

- notas de conversación, decisiones pendientes, bloqueos y próximas acciones
- workspace fingerprint, rutas del proyecto, pistas de entorno y notas de dependencias
- archivos modificados, resultados de comandos, efectos secundarios de herramientas y estrategia de recuperación
- source Agent, target Agent, session IDs, run IDs y referencias a logs de eventos

No debe contener secretos en texto plano, como contraseñas, API keys de larga duración, credenciales SMTP, claves privadas SSH, cookies o cadenas de conexión a bases de datos.

## Arquitectura

```text
client/       React + Vite frontend
server/       NestJS API, auth, package exchange, OpenAPI gateway
shared/       Shared package protocol docs and types
scripts/      CLI and deployment helpers
docs/         Supporting project documentation
```

## Stack técnico

- Frontend: React, Vite, Tailwind CSS 4, Framer Motion
- Backend: NestJS, Express, PostgreSQL, Drizzle ORM
- Auth: bcrypt password hash, JWT access token, HttpOnly refresh cookie
- Mail: SMTP email verification codes
- Runtime: Node.js 20+, npm 10+

## Desarrollo local

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

Comandos útiles:

```bash
npm run type:check
npm run build:server
npm run build:client
npm run build:prod
npm run test
```

## Entorno

Empieza desde `.env.example`. Para verificación por email en producción, configura SMTP:

```env
EMAIL_CODE_SECRET=replace-with-a-random-secret
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=replace-with-provider-password-or-app-code
SMTP_FROM="Extoken <no-reply@example.com>"
```

No subas archivos `.env` reales al repositorio.

## CLI

```bash
npm run extoken -- pack handoff.json
npm run extoken -- redeem EXT-XXXX-XXXX-XXXX --out package.json
npm run extoken -- install-skill
```

## Seguridad

Los paquetes Extoken son para contexto de tareas, no para almacenar credenciales. Consulta [SECURITY.md](SECURITY.md) para reportar problemas de seguridad.

## Licencia

Copyright 2026 Extoken contributors. Todos los derechos reservados salvo que se añada una licencia separada.
