import { createClient, type SanityClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined
const dataset   = (import.meta.env.VITE_SANITY_DATASET as string | undefined) || 'production'
const token     = import.meta.env.VITE_SANITY_TOKEN as string | undefined

function isSanityProjectId(id: string | undefined): id is string {
  return typeof id === 'string' && /^[a-z0-9-]+$/.test(id) && id.length > 0
}

let client: SanityClient | null = null
try {
  if (isSanityProjectId(projectId)) {
    client = createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
      token,
    })
  }
} catch {
  client = null
}

export { client }

const builder = client ? imageUrlBuilder(client) : null
export const urlFor = (source: any) => builder?.image(source)

export async function sanityFetch<T>(query: string, params: Record<string, any> = {}): Promise<T | null> {
  if (!client) return null
  try {
    return await client.fetch<T>(query, params)
  } catch {
    return null
  }
}
