import fs from 'node:fs'
import path from 'node:path'

if (process.platform !== 'win32') {
  process.exit(0)
}

const target = path.join(
  process.cwd(),
  'node_modules',
  '@opennextjs',
  'aws',
  'dist',
  'build',
  'copyTracedFiles.js'
)

if (!fs.existsSync(target)) {
  console.error('[patch-opennext] copyTracedFiles.js tidak ditemukan. Jalankan npm install dulu.')
  process.exit(1)
}

const marker = '// [pinang-ranti] win32 symlink fallback'
const source = fs.readFileSync(target, 'utf8')

if (source.includes(marker)) {
  process.exit(0)
}

const original = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }`

const replacement = `        if (symlink) {
            try {
                symlinkSync(symlink, to);
            }
            catch (e) {
                if (e.code === "EPERM" || e.code === "EACCES" || e.code === "UNKNOWN") {
                    ${marker}
                    cpSync(from, to, { recursive: true, dereference: true });
                }
                else if (e.code !== "EEXIST") {
                    throw e;
                }
            }
        }`

if (!source.includes(original)) {
  console.error('[patch-opennext] Pola symlink tidak dikenali; patch dilewati.')
  process.exit(1)
}

fs.writeFileSync(target, source.replace(original, replacement))
console.log('[patch-opennext] Fallback symlink Windows dipasang.')
