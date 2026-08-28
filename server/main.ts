import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { __express as hbsExpressEngine } from 'hbs';

import { AppModule } from './app.module';

function readCorsOrigins(): Array<string | RegExp> {
  const raw = process.env.CORS_ORIGIN;
  if (!raw) {
    return [
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ];
  }
  const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.map((p) => (p.startsWith('/') && p.endsWith('/') ? new RegExp(p.slice(1, -1)) : p));
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    abortOnError: process.env.NODE_ENV !== 'development',
    bodyParser: true,
    rawBody: true,
  });

  const logger = new Logger('Bootstrap');
  const host = process.env.SERVER_HOST || '0.0.0.0';
  const port = Number(process.env.SERVER_PORT || '3000');
  const trustProxy = process.env.TRUST_PROXY === 'true';
  const isProd = process.env.NODE_ENV === 'production';

  if (trustProxy) {
    app.set('trust proxy', 1);
  }

  // ===== 安全头 =====
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            useDefaults: true,
            directives: {
              'default-src': ["'self'"],
              'script-src': ["'self'", "'unsafe-inline'"],
              'style-src': ["'self'", "'unsafe-inline'", 'https:'],
              'img-src': ["'self'", 'data:', 'https:'],
              'connect-src': ["'self'", 'wss:', 'ws:', 'https:'],
              'font-src': ["'self'", 'data:', 'https:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
    }),
  );

  // ===== CORS =====
  app.enableCors({
    origin: readCorsOrigins(),
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'x-extoken-key',
      'x-correlation-id',
    ],
    exposedHeaders: ['Content-Disposition', 'x-request-id'],
    maxAge: 86_400,
  });

  // ===== 压缩 & Cookie =====
  app.use(compression({ level: 6 }));
  app.use(cookieParser(process.env.COOKIE_SECRET || 'extoken-selfhost-cookie-secret'));

  // ===== 全局反爬限流（不依赖 ThrottlerModule，走 Express 原生，覆盖非 Controller 路径）=====
  if (isProd) {
    const apiLimiter = rateLimit({
      windowMs: 60_000,
      max: Number(process.env.RATE_LIMIT_PER_MIN || 180),
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) =>
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket.remoteAddress ||
        'unknown',
    });
    app.use('/api/', apiLimiter);

    const authLimiter = rateLimit({
      windowMs: 10 * 60_000,
      max: Number(process.env.RATE_LIMIT_AUTH || 30),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: { code: 'RATE_LIMITED', message: '登录/注册过于频繁，请稍后再试' } },
    });
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/register', authLimiter);
    app.use('/api/auth/email-code', authLimiter);
    app.use('/api/auth/reset-password', authLimiter);
  }

  // ===== 全局 DTO 校验 =====
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ===== 路由前缀 =====
  // 注意：业务 controller 里 @Controller('api/xxx') 已经自带 api，所以这里不设 global prefix

  // ===== 静态资源 & 视图引擎 =====
  const distClient = join(process.cwd(), 'dist/client');
  app.useStaticAssets(distClient, {
    prefix: '/',
    setHeaders: (res, filePath) => {
      // 带 hash 的静态资源做长缓存
      if (/\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|webp|avif|ico)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });
  app.setBaseViewsDir(distClient);
  app.setViewEngine('html');
  app.engine('html', hbsExpressEngine);

  await app.listen(port, host);
  logger.log(`[Extoken Self-host] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
  logger.log(`Server running on ${host}:${port}`);
  logger.log(`API endpoints at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api`);
  logger.log(`Auth health: GET http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api/auth/health`);
}

bootstrap();
