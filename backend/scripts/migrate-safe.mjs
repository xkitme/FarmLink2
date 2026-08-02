import { closeSync, existsSync, mkdirSync, openSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const DRIFT_MIGRATION = '20260802115000_add_password_changed_at'
const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(scriptDir, '..')
const schemaPath = path.join(backendRoot, 'prisma', 'schema.prisma')
const prismaCli = path.join(backendRoot, 'node_modules', 'prisma', 'build', 'index.js')

function ensureSqliteFile(databaseUrl) {
  if (!databaseUrl?.startsWith('file:')) return
  const rawPath = databaseUrl.slice('file:'.length).split('?')[0]
  const databasePath = path.isAbsolute(rawPath)
    ? rawPath
    : path.resolve(path.dirname(schemaPath), rawPath)
  mkdirSync(path.dirname(databasePath), { recursive: true })
  if (!existsSync(databasePath)) closeSync(openSync(databasePath, 'w'))
}

function prismaCommand(...args) {
  execFileSync(process.execPath, [prismaCli, ...args, '--schema', schemaPath], {
    cwd: backendRoot,
    env: process.env,
    stdio: 'inherit',
  })
}

async function repairPasswordChangedAtHistory() {
  const prisma = new PrismaClient()
  try {
    const userTable = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 't_user'`,
    )
    if (userTable.length === 0) return false

    const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("t_user")`)
    if (!columns.some((column) => column.name === 'passwordChangedAt')) return false

    const migrationTable = await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '_prisma_migrations'`,
    )
    if (migrationTable.length === 0) return false
    const applied = await prisma.$queryRawUnsafe(
      `SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = ? AND finished_at IS NOT NULL`,
      DRIFT_MIGRATION,
    )
    return applied.length === 0
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  ensureSqliteFile(process.env.DATABASE_URL)
  if (await repairPasswordChangedAtHistory()) {
    console.log(`检测到 passwordChangedAt 已存在，补记迁移历史：${DRIFT_MIGRATION}`)
    prismaCommand('migrate', 'resolve', '--applied', DRIFT_MIGRATION)
  }
  prismaCommand('migrate', 'deploy')
}

main().catch((error) => {
  console.error('数据库迁移失败:', error.message)
  process.exit(1)
})
