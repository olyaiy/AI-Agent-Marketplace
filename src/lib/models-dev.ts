export interface ModelsDevModel {
  id: string
  name: string
  provider: string
}

export interface ModelsDevProvider {
  id: string
  name: string
  models: Record<string, ModelsDevModel>
}

export interface ModelsDevResponse {
  [providerId: string]: ModelsDevProvider
}

function mapToFlatModels(data: ModelsDevResponse): ModelsDevModel[] {
  const flat: ModelsDevModel[] = []
  for (const [providerId, provider] of Object.entries(data)) {
    if (!provider?.models) continue
    for (const model of Object.values(provider.models)) {
      flat.push({ ...model, provider: providerId })
    }
  }
  return flat.sort((a, b) => a.name.localeCompare(b.name))
}

export async function fetchAllModels(): Promise<ModelsDevModel[]> {
  const res = await fetch('https://models.dev/api.json', {
    // Force edge caching for SSR; client components should not call this directly
    next: { revalidate: 60 },
  })
  if (!res.ok) return []
  const data = (await res.json()) as ModelsDevResponse
  return mapToFlatModels(data)
}


