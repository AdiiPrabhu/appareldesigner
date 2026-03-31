type ClassValue = string | boolean | undefined | null | Record<string, boolean>

export function cn(...inputs: ClassValue[]): string {
  const result: string[] = []
  for (const input of inputs) {
    if (!input) continue
    if (typeof input === 'string') {
      result.push(input)
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) result.push(key)
      }
    }
  }
  return result.join(' ')
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + '...'
}

export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function productTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tshirt: 'T-Shirt',
    hoodie: 'Hoodie',
    jacket: 'Jacket',
    sweatshirt: 'Sweatshirt',
    cap: 'Cap',
    custom: 'Custom',
  }
  return labels[type] || type
}

export function outputStyleLabel(style: string): string {
  const labels: Record<string, string> = {
    flat_graphic: 'Flat Graphic',
    streetwear: 'Streetwear',
    embroidery: 'Embroidery',
    minimal_vector: 'Minimal Vector',
    vintage_distressed: 'Vintage / Distressed',
    futuristic: 'Futuristic',
    anime_inspired: 'Anime-Inspired',
    abstract: 'Abstract',
    custom: 'Custom',
  }
  return labels[style] || style
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
