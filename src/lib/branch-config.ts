export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || 'Seafood Vian Jaya 08'

export const STORE_NAME =
  process.env.NEXT_PUBLIC_STORE_NAME?.trim() || 'Seafood Vian Jaya 08 Pinang Ranti (Pusat)'

export const DEFAULT_BRANCH_NAME =
  process.env.NEXT_PUBLIC_BRANCH_NAME?.trim() || 'Pinang Ranti (Pusat)'

export const DEFAULT_BRANCH_KODE =
  process.env.NEXT_PUBLIC_BRANCH_KODE?.trim() || 'BJK-1'

export const CONTACT_WA = process.env.NEXT_PUBLIC_CONTACT_WA?.trim() || '0852-8000-4508'

/** Label cabang yang dicetak di header struk, terpisah dari nama warung di database. */
export const RECEIPT_BRANCH_NAME =
  process.env.NEXT_PUBLIC_RECEIPT_BRANCH_NAME?.trim() || 'Seafood Vian Jaya 08 Pinang Ranti (Pusat)'

const socialHandles: Array<[string, string | undefined]> = [
  ['IG', process.env.NEXT_PUBLIC_INSTAGRAM ?? 'Seafoodvianjaya.id'],
  ['FB', process.env.NEXT_PUBLIC_FACEBOOK ?? 'Seafoodvianjaya'],
  ['TT', process.env.NEXT_PUBLIC_TIKTOK ?? 'Seafoodvianjaya'],
]

export const SOCIAL_LINES: string[] = socialHandles.flatMap(([label, handle]) => {
  const value = handle?.trim()
  return value ? [`${label} : ${value}`] : []
})

export function formatBranchLine(branchName: string | null | undefined): string {
  return `Cabang : ${branchName?.trim() || DEFAULT_BRANCH_NAME}`
}
