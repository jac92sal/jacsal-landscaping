/**
 * Property assessment from customer photos.
 *
 * The whole design rests on one rule: **the model classifies, it never prices
 * and never measures.** It is given the tenant's own catalog as a closed
 * vocabulary and may only answer with `service_value` keys drawn from it. Any
 * key it invents is dropped before the customer sees anything and recorded in
 * `rejected_service_values` so drift is visible rather than silent. Prices are
 * looked up from the catalog at render time, so editing a price in the admin
 * updates every future quote and no dollar figure can be hallucinated.
 *
 * Measurements are handled entirely elsewhere (see measure.ts) — a handheld
 * photo has no scale reference, so asking for square footage here would produce
 * a guess wearing the costume of a measurement.
 */
import Anthropic from '@anthropic-ai/sdk'
import type { Service, Tenant } from './tenants'
import { nowS } from './http'

/**
 * Cap on photos sent to the model. Opus 5 is in the high-resolution tier
 * (~4,784 tokens for a full-size image), so this is the main cost lever on the
 * request. The client downscales before upload, which cuts both this and R2
 * storage. Photos beyond the cap are stored and shown to the admin — they are
 * only excluded from the vision call.
 */
const MAX_PHOTOS = 10

/** Generous because thinking is on by default on Opus 5 and shares this budget. */
const MAX_TOKENS = 8000

export type Severity = 'low' | 'medium' | 'high'
export type Confidence = 'low' | 'medium' | 'high'
export type Priority = 'essential' | 'recommended' | 'optional'

export interface Observation {
  area: string
  condition: string
  detail: string
  severity: Severity
}

export interface SuggestedService {
  service_value: string
  reason: string
  confidence: Confidence
  priority: Priority
}

interface ModelOutput {
  observations: Observation[]
  suggested_services: SuggestedService[]
  crew_notes: string
  photo_quality_issues: string[]
}

export interface AssessmentResult {
  status: 'ok' | 'no_key' | 'no_photos' | 'refused' | 'error'
  error: string | null
  model: string | null
  photoCount: number
  observations: Observation[]
  /** Services addressing what they asked for, or flagged essential. */
  recommendedServices: SuggestedService[]
  /** The upsell: add-on-eligible services they did not ask for. */
  addonServices: SuggestedService[]
  crewNotes: string
  photoQualityIssues: string[]
  rejectedServiceValues: string[]
  inputTokens: number | null
  outputTokens: number | null
}

export interface PhotoInput {
  area: string
  caption: string | null
  mimeType: string
  bytes: ArrayBuffer
}

/**
 * Structured-output schema. Constraints that apply here: every object needs
 * `additionalProperties: false` and a complete `required` list, and numeric or
 * string length bounds are not supported — so bounds live in the prompt.
 */
const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['observations', 'suggested_services', 'crew_notes', 'photo_quality_issues'],
  properties: {
    observations: {
      type: 'array',
      description: 'What is actually visible in the photos. Evidence, not recommendations.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['area', 'condition', 'detail', 'severity'],
        properties: {
          area: {
            type: 'string',
            enum: ['front', 'back', 'side', 'problem', 'other'],
            description: 'Which labelled photo this observation came from.',
          },
          condition: {
            type: 'string',
            description: 'Short label, e.g. "overgrown turf", "dead shrubs", "exposed sprinkler head".',
          },
          detail: {
            type: 'string',
            description: 'One sentence describing what is visible that supports this.',
          },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
      },
    },
    suggested_services: {
      type: 'array',
      description: 'Services from the provided catalog that the observations justify.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['service_value', 'reason', 'confidence', 'priority'],
        properties: {
          service_value: {
            type: 'string',
            description: 'MUST be copied exactly from the catalog. Never invent one.',
          },
          reason: {
            type: 'string',
            description:
              'One customer-facing sentence tying this to something visible in a photo. No prices.',
          },
          confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
          priority: { type: 'string', enum: ['essential', 'recommended', 'optional'] },
        },
      },
    },
    crew_notes: {
      type: 'string',
      description:
        'Practical notes for the crew — access, obstacles, terrain, anything affecting the visit. Empty string if nothing notable.',
    },
    photo_quality_issues: {
      type: 'array',
      description:
        'Photos too dark, blurry, or narrowly framed to judge. Empty array if all usable.',
      items: { type: 'string' },
    },
  },
} as const

function buildSystemPrompt(): string {
  return [
    'You are an experienced landscaping estimator reviewing photos a homeowner submitted with a service request.',
    '',
    'Your job is to report what is visibly wrong with the property and map those conditions to services from the provided catalog.',
    '',
    'Rules:',
    '- Only cite conditions you can actually SEE in a photo. Do not infer seasonal history, soil chemistry, or anything the image cannot show.',
    '- `service_value` must be copied exactly from the catalog. Never invent a service or a variant name.',
    '- Never state, estimate, or imply a price, a quantity, or a square footage. Pricing and measurement are handled outside this step, and a number from you would be a guess presented as a fact.',
    '- Every suggested service must trace to a specific observation. If nothing visible justifies it, leave it out.',
    '- Prefer fewer, well-supported suggestions over a long speculative list. An empty list is a valid answer for a well-maintained yard.',
    '- If photos are too dark, blurry, or tightly framed to judge, say so in photo_quality_issues rather than guessing.',
    '- Write `reason` for the homeowner: plain, specific, non-alarming. One sentence.',
  ].join('\n')
}

function buildCatalogBlock(services: Service[]): string {
  return services
    .map((s) => {
      const parts = [`- service_value: ${s.serviceValue}`, `  name: ${s.name}`]
      if (s.description) parts.push(`  what it covers: ${s.description}`)
      if (s.triggers) parts.push(`  suggest when you see: ${s.triggers}`)
      return parts.join('\n')
    })
    .join('\n')
}

function buildUserPrompt(input: {
  services: Service[]
  requestedServices: string[]
  cadence: string | null
  propertyType: string | null
  notes: string | null
  photos: PhotoInput[]
}): string {
  const { services, requestedServices, cadence, propertyType, notes, photos } = input

  const requested = requestedServices.length
    ? requestedServices.join(', ')
    : '(nothing specific — they are asking for a general assessment)'

  const photoList = photos
    .map((p, i) => `  ${i + 1}. ${p.area}${p.caption ? ` — "${p.caption}"` : ''}`)
    .join('\n')

  return [
    'SERVICE CATALOG — the only services you may suggest. Copy `service_value` exactly:',
    buildCatalogBlock(services),
    '',
    'WHAT THE CUSTOMER ASKED FOR:',
    `  services: ${requested}`,
    `  frequency: ${cadence ?? 'not specified'}`,
    `  property type: ${propertyType ?? 'not specified'}`,
    notes ? `  their notes: ${notes}` : '  their notes: (none)',
    '',
    `PHOTOS (${photos.length}), in order, each labelled with the area it shows:`,
    photoList,
    '',
    'Review the photos and return your assessment.',
  ].join('\n')
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  // Chunked to avoid blowing the argument limit on large images.
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** The API accepts these four; anything else is rejected before the call. */
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

function emptyResult(status: AssessmentResult['status'], error: string | null): AssessmentResult {
  return {
    status,
    error,
    model: null,
    photoCount: 0,
    observations: [],
    recommendedServices: [],
    addonServices: [],
    crewNotes: '',
    photoQualityIssues: [],
    rejectedServiceValues: [],
    inputTokens: null,
    outputTokens: null,
  }
}

export async function assessProperty(
  env: Env,
  input: {
    tenant: Tenant
    services: Service[]
    photos: PhotoInput[]
    requestedServices: string[]
    cadence: string | null
    propertyType: string | null
    notes: string | null
  },
): Promise<AssessmentResult> {
  const { tenant, services, requestedServices, cadence, propertyType, notes } = input

  const usable = input.photos.filter((p) => SUPPORTED_IMAGE_TYPES.has(p.mimeType)).slice(0, MAX_PHOTOS)
  if (usable.length === 0) {
    return emptyResult('no_photos', 'No usable photos were supplied for this property.')
  }

  const activeServices = services.filter((s) => s.isActive)
  if (activeServices.length === 0) {
    return emptyResult('error', 'This tenant has no active services, so there is nothing to suggest.')
  }

  let apiKey: string
  try {
    apiKey = await env.ANTHROPIC_API_KEY.get()
  } catch {
    return emptyResult('no_key', 'The AI assessment key is not configured for this deployment.')
  }
  if (!apiKey) {
    return emptyResult('no_key', 'The AI assessment key is not configured for this deployment.')
  }

  const model = tenant.assessmentModel || env.ASSESSMENT_MODEL || 'claude-opus-5'
  const client = new Anthropic({ apiKey })

  try {
    const response = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(),
      output_config: { format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      messages: [
        {
          role: 'user',
          content: [
            ...usable.map((photo) => ({
              type: 'image' as const,
              source: {
                type: 'base64' as const,
                media_type: photo.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: toBase64(photo.bytes),
              },
            })),
            {
              type: 'text' as const,
              text: buildUserPrompt({
                services: activeServices,
                requestedServices,
                cadence,
                propertyType,
                notes,
                photos: usable,
              }),
            },
          ],
        },
      ],
    })

    // Always check stop_reason before touching content — a refusal returns 200
    // with empty or partial content, and indexing content[0] would throw.
    if (response.stop_reason === 'refusal') {
      return {
        ...emptyResult('refused', 'The assessment was declined by the model’s safety system.'),
        model,
        photoCount: usable.length,
      }
    }

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return { ...emptyResult('error', 'The model returned no assessment text.'), model }
    }

    let parsed: ModelOutput
    try {
      parsed = JSON.parse(textBlock.text) as ModelOutput
    } catch {
      return {
        ...emptyResult('error', 'The model returned malformed JSON.'),
        model,
        photoCount: usable.length,
      }
    }

    // ---- Validate against the catalog ------------------------------------
    // This is the guardrail that makes the whole feature safe to show a
    // customer: anything not in the tenant's own catalog never reaches them.
    const byValue = new Map(activeServices.map((s) => [s.serviceValue, s]))
    const requestedSet = new Set(requestedServices)

    const recommendedServices: SuggestedService[] = []
    const addonServices: SuggestedService[] = []
    const rejectedServiceValues: string[] = []
    const seen = new Set<string>()

    for (const suggestion of parsed.suggested_services ?? []) {
      const value = suggestion?.service_value
      const service = value ? byValue.get(value) : undefined
      if (!service) {
        if (value) rejectedServiceValues.push(value)
        continue
      }
      if (seen.has(value)) continue // model repeated itself
      seen.add(value)

      // Split deterministically rather than trusting the model to categorise:
      // anything they already asked for, or that is not add-on eligible, is a
      // core recommendation. The rest is the upsell.
      const isUpsell = !requestedSet.has(value) && service.isAddon
      ;(isUpsell ? addonServices : recommendedServices).push(suggestion)
    }

    return {
      status: 'ok',
      error: null,
      model,
      photoCount: usable.length,
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      recommendedServices,
      addonServices,
      crewNotes: typeof parsed.crew_notes === 'string' ? parsed.crew_notes : '',
      photoQualityIssues: Array.isArray(parsed.photo_quality_issues)
        ? parsed.photo_quality_issues
        : [],
      rejectedServiceValues,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    }
  } catch (err) {
    // Never leak provider internals to the customer; log and return a clean code.
    console.error('[assess] vision call failed', err)
    return {
      ...emptyResult('error', 'The assessment could not be completed. A human will review the photos.'),
      model,
      photoCount: usable.length,
    }
  }
}

/** Persist an assessment run. Append-only so re-runs stay comparable. */
export async function saveAssessment(
  env: Env,
  tenantSlug: string,
  leadId: string,
  result: AssessmentResult,
): Promise<string> {
  const id = crypto.randomUUID()
  await env.DB.prepare(
    `INSERT INTO assessments
       (id, tenant_slug, lead_id, created_at, status, error, model, photo_count,
        observations, recommended_services, addon_services, crew_notes,
        photo_quality_issues, rejected_service_values, input_tokens, output_tokens)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      id,
      tenantSlug,
      leadId,
      nowS(),
      result.status,
      result.error,
      result.model,
      result.photoCount,
      JSON.stringify(result.observations),
      JSON.stringify(result.recommendedServices),
      JSON.stringify(result.addonServices),
      result.crewNotes,
      JSON.stringify(result.photoQualityIssues),
      JSON.stringify(result.rejectedServiceValues),
      result.inputTokens,
      result.outputTokens,
    )
    .run()
  return id
}
