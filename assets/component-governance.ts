import registry from '../component-registry.json'

export type FaceUiComponentStatus = 'stable' | 'beta' | 'deprecated'
export type FaceUiComponentCategory =
  | 'primitive'
  | 'display'
  | 'content'
  | 'form'
  | 'overlay'
  | 'overlay-form'
  | 'overlay-primitive'
  | 'feedback'
  | 'navigation'
  | 'layout'
  | 'pattern'

export interface FaceUiComponentMeta {
  category: FaceUiComponentCategory
  status: FaceUiComponentStatus
  a11yReviewed: boolean
  mobileReviewed: boolean
  responsiveSurface?: string
  aliases?: string[]
  related?: string[]
  replacedBy?: string[]
}

interface FaceUiRegistry {
  version: number
  governance: {
    qualityGates: string[]
    maturityLevels: FaceUiComponentStatus[]
    changePolicy: Record<string, string>
    responsiveBreakpoints: { overlaySheet: number }
    ownership: string[]
  }
  components: Record<string, FaceUiComponentMeta>
  plannedComponents: Record<string, { priority: string; reason: string }>
}

const typedRegistry = registry as FaceUiRegistry

export const FACE_UI_COMPONENT_REGISTRY = typedRegistry
export const FACE_UI_COMPONENT_META = typedRegistry.components

export function getFaceUiComponentMeta(name: string): FaceUiComponentMeta | null {
  const direct = typedRegistry.components[name]
  if (direct) return direct
  const match = Object.values(typedRegistry.components).find((meta) => Array.isArray(meta.aliases) && meta.aliases.includes(name))
  return match ?? null
}

export function isDeprecatedFaceUiComponent(name: string): boolean {
  return getFaceUiComponentMeta(name)?.status === 'deprecated'
}
