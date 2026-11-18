import 'server-only'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

/**
 * Private file storage on the local filesystem (outside /public — files are only served
 * through the permission-checked /api/documents route). Swap this module for S3/GCS/Vercel Blob
 * in production; the interface is put/get/remove by opaque key.
 */
const ROOT = path.resolve(process.env.STORAGE_DIR ?? './storage')

function resolveKey(key: string) {
  const full = path.resolve(ROOT, key)
  if (!full.startsWith(ROOT + path.sep)) throw new Error('Invalid storage key')
  return full
}

export async function putFile(organizationId: string, filename: string, data: Buffer) {
  const safe = filename.replace(/[^a-z0-9._-]+/gi, '_').slice(-80)
  const key = `${organizationId}/${randomUUID()}-${safe}`
  const full = resolveKey(key)
  await mkdir(path.dirname(full), { recursive: true })
  await writeFile(full, data)
  return key
}

export async function getFile(key: string) {
  return readFile(resolveKey(key))
}

export async function removeFile(key: string) {
  await unlink(resolveKey(key)).catch(() => {})
}

export const MAX_UPLOAD = 10 * 1024 * 1024
export const ALLOWED_MIME = /^(image\/(png|jpe?g|webp|gif|svg\+xml)|application\/pdf|text\/(plain|csv)|application\/(msword|vnd\.openxmlformats-officedocument\.[a-z.]+|vnd\.ms-excel|vnd\.ms-powerpoint|zip))$/
