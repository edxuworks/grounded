/**
 * Build a self-contained serverless bundle of the API for Vercel.
 *
 * Why bundle? apps/api uses `@/` path aliases and the workspace package
 * `@grounded/db` (a pnpm symlink outside this dir). A plain `tsc` build leaves
 * those unresolved and doesn't pull the workspace code into the function.
 * esbuild inlines all of it into one file, resolving aliases via tsconfig.
 *
 * Prisma's query engine (.node) and schema.prisma are loaded at runtime from
 * the directory of the bundle, so we copy them next to the output.
 */
import { build } from 'esbuild'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outdir = resolve(__dirname, 'dist-vercel')
mkdirSync(outdir, { recursive: true })

await build({
  entryPoints: [resolve(__dirname, 'src/index.ts')],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node20',
  outfile: resolve(outdir, 'index.js'),
  tsconfig: resolve(__dirname, 'tsconfig.json'),
  // Prisma's engine .node is loaded dynamically at runtime, not statically —
  // keep .node files as external file references.
  loader: { '.node': 'file' },
  logLevel: 'info',
})

// Prisma runtime files that must sit next to the bundle (loaded via __dirname).
const genDir = resolve(__dirname, '../../packages/db/src/generated/client')
const prismaFiles = [
  'schema.prisma',
  'libquery_engine-rhel-openssl-3.0.x.so.node',
  'libquery_engine-darwin-arm64.dylib.node',
]
for (const f of prismaFiles) {
  try {
    copyFileSync(resolve(genDir, f), resolve(outdir, f))
    console.log('copied', f)
  } catch (e) {
    console.warn('skip', f, e.message)
  }
}

// ── Vercel Build Output API (v3) ────────────────────────────────────────────
// Emit a ready-to-serve serverless function so we can `vercel deploy --prebuilt`
// with NO install/build step on Vercel (avoids pnpm workspace: install errors).
const funcDir = resolve(__dirname, '.vercel/output/functions/api.func')
mkdirSync(funcDir, { recursive: true })
copyFileSync(resolve(outdir, 'index.js'), resolve(funcDir, 'index.js'))
for (const f of prismaFiles) {
  try {
    copyFileSync(resolve(outdir, f), resolve(funcDir, f))
  } catch {}
}
writeFileSync(
  resolve(funcDir, '.vc-config.json'),
  JSON.stringify(
    {
      runtime: 'nodejs20.x',
      handler: 'index.js',
      launcherType: 'Nodejs',
      shouldAddHelpers: true,
      maxDuration: 30,
    },
    null,
    2,
  ),
)
writeFileSync(
  resolve(__dirname, '.vercel/output/config.json'),
  JSON.stringify({ version: 3, routes: [{ src: '/(.*)', dest: '/api' }] }, null, 2),
)
console.log('Build Output API written to .vercel/output')
