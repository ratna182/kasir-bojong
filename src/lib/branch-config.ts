export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME?.trim() || 'Kasir Bojong'

export const STORE_NAME =
  process.env.NEXT_PUBLIC_STORE_NAME?.trim() || 'Seafood & Nasi Uduk Bojong'

export const DEFAULT_BRANCH_NAME =
  process.env.NEXT_PUBLIC_BRANCH_NAME?.trim() || `${STORE_NAME} - Cabang 1`

export const DEFAULT_BRANCH_KODE =
  process.env.NEXT_PUBLIC_BRANCH_KODE?.trim() || 'BJ-1'

export const CONTACT_WA = process.env.NEXT_PUBLIC_CONTACT_WA?.trim() || ''

const socialHandles: Array<[string, string | undefined]> = [
  ['IG', process.env.NEXT_PUBLIC_INSTAGRAM],
  ['FB', process.env.NEXT_PUBLIC_FACEBOOK],
  ['TT', process.env.NEXT_PUBLIC_TIKTOK],
]

export const SOCIAL_LINES: string[] = socialHandles.flatMap(([label, handle]) => {
  const value = handle?.trim()
  return value ? [`${label} : ${value}`] : []
})

export function formatBranchLine(branchName: string | null | undefined): string {
  return `Cabang : ${branchName?.trim() || DEFAULT_BRANCH_NAME}`
}
