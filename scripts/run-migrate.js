/**
 * 执行 drizzle-kit 生成的 SQL 迁移文件（开发阶段调用）
 * 用法：
 *   npm run db:migrate           # 在本地生成并执行迁移
 *   node scripts/run-migrate.js
 *
 * 生产环境（ECS）上也可以运行（需要先装好依赖），但更推荐直接跑 schema.sql：
 *   node scripts/init-db.js --only-schema
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const root = path.resolve(__dirname, '..');
const envFile = process.env.ENV_FILE || path.join(root, '.env');

if (fs.existsSync(envFile)) {
  // 直接读一遍环境变量
  require('dotenv').config({ path: envFile });
}

function run(cmd, args, opts = {}) {
  console.log(`\n> ${cmd} ${args.join(' ')}\n`);
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log('[db:migrate] 生成迁移 SQL...');
run('npx', ['drizzle-kit', 'generate', '--config', 'drizzle.config.ts']);

console.log('[db:migrate] 应用迁移到目标库...');
run('npx', ['drizzle-kit', 'migrate', '--config', 'drizzle.config.ts']);

console.log('[db:migrate] 迁移完成 ✅');
