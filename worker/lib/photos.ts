/**
 * Property photos.
 *
 * Bytes live in R2 (`PHOTOS`), metadata in D1. The bucket has no public access:
 * admins and the vision call both reach images through this Worker, so an image
 * URL can never be shared out of context or indexed.
 */
import { badRequest, nowS } from './http'
import type { PhotoInput } from './assess'

/** Kept in step with what the vision API accepts, plus HEIC for iPhone uploads. */
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])

const EXT_OF: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
}

/** 20 MB, matching the bucket. The client downscales well below this. */
const MAX_BYTES = 20 * 1024 * 1024

export const PHOTO_AREAS = ['front', 'back', 'side', 'problem', 'other'] as const
export type PhotoArea = (typeof PHOTO_AREAS)[number]

export interface PhotoRow {
  id: string
  tenant_slug: string
  lead_id: string
  created_at: number
  area: string
  caption: string | null
  r2_key: string
  file_name: string | null
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null
}

export function toPhotoDto(row: PhotoRow) {
  return {
    id: row.id,
    area: row.area,
    caption: row.caption,
    fileName: row.file_name,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    createdAt: row.created_at,
    /** Always served through the Worker — the bucket itself stays private. */
    url: `/api/photos/${row.id}`,
  }
}

export async function uploadPhoto(
  env: Env,
  tenantSlug: string,
  leadId: string,
  input: { area: string; caption: string | null; file: File },
): Promise<PhotoRow> {
  const { file } = input

  const mime = (file.type || '').toLowerCase()
  if (!ALLOWED_MIME.has(mime)) {
    throw badRequest('That file type is not supported. Please upload a JPEG, PNG, WebP, or HEIC photo.')
  }
  if (file.size > MAX_BYTES) {
    throw badRequest('That photo is larger than 20 MB. Please upload a smaller version.')
  }
  if (file.size === 0) {
    throw badRequest('That file appears to be empty.')
  }

  const area = (PHOTO_AREAS as readonly string[]).includes(input.area) ? input.area : 'other'
  const id = crypto.randomUUID()
  const key = `${tenantSlug}/${leadId}/${id}.${EXT_OF[mime] ?? 'bin'}`

  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: mime },
    customMetadata: { tenantSlug, leadId, area },
  })

  await env.DB.prepare(
    `INSERT INTO photos
       (id, tenant_slug, lead_id, created_at, area, caption, r2_key, file_name, file_size, mime_type)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      tenantSlug,
      leadId,
      nowS(),
      area,
      input.caption?.slice(0, 500) ?? null,
      key,
      file.name?.slice(0, 255) ?? null,
      file.size,
      mime,
    )
    .run()

  const row = await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(id).first<PhotoRow>()
  if (!row) throw new Error('photo insert did not round-trip')
  return row
}

export async function listPhotos(env: Env, leadId: string): Promise<PhotoRow[]> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM photos WHERE lead_id = ? ORDER BY created_at ASC',
  )
    .bind(leadId)
    .all<PhotoRow>()
  return results ?? []
}

export async function getPhoto(env: Env, photoId: string): Promise<PhotoRow | null> {
  return await env.DB.prepare('SELECT * FROM photos WHERE id = ?').bind(photoId).first<PhotoRow>()
}

export async function deletePhoto(env: Env, photoId: string, leadId: string): Promise<boolean> {
  const row = await env.DB.prepare('SELECT * FROM photos WHERE id = ? AND lead_id = ?')
    .bind(photoId, leadId)
    .first<PhotoRow>()
  if (!row) return false
  await env.PHOTOS.delete(row.r2_key)
  await env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run()
  return true
}

/**
 * Load photo bytes for the vision call.
 *
 * HEIC is filtered out here rather than earlier: the API cannot read it, but we
 * still want to accept and store it so an iPhone upload never fails outright —
 * the admin can view it and it simply sits out of the assessment.
 */
export async function loadPhotosForAssessment(env: Env, leadId: string): Promise<PhotoInput[]> {
  const rows = await listPhotos(env, leadId)
  const out: PhotoInput[] = []
  for (const row of rows) {
    const object = await env.PHOTOS.get(row.r2_key)
    if (!object) {
      console.warn(`[photos] R2 object missing for photo ${row.id} (${row.r2_key})`)
      continue
    }
    out.push({
      area: row.area,
      caption: row.caption,
      mimeType: row.mime_type ?? 'image/jpeg',
      bytes: await object.arrayBuffer(),
    })
  }
  return out
}
