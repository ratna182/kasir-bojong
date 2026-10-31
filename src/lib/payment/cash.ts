export interface CashPaymentResult {
  isValid: boolean
  kembalian: number
  message: string
  isUangPas: boolean
}

export function hitungKembalian(uangDiterima: number, totalTagihan: number): CashPaymentResult {
  if (uangDiterima < 0 || totalTagihan < 0) {
    return { isValid: false, kembalian: 0, message: 'Input tidak valid', isUangPas: false }
  }

  const selisih = uangDiterima - totalTagihan

  if (selisih < 0) {
    return {
      isValid: false,
      kembalian: 0,
      message: `Uang kurang Rp ${Math.abs(selisih).toLocaleString('id-ID')}`,
      isUangPas: false
    }
  }

  if (selisih === 0) {
    return { isValid: true, kembalian: 0, message: 'Uang Pas', isUangPas: true }
  }

  return {
    isValid: true,
    kembalian: selisih,
    message: `Kembalian Rp ${selisih.toLocaleString('id-ID')}`,
    isUangPas: false
  }
}

export function generateQuickAmounts(totalTagihan: number): number[] {
  const amounts: number[] = [totalTagihan]

  const rounded = Math.ceil(totalTagihan / 1000) * 1000
  if (rounded !== totalTagihan) {
    amounts.push(rounded)
  }

  const denominations = [10000, 20000, 50000, 100000]
  for (const denom of denominations) {
    if (denom >= totalTagihan && !amounts.includes(denom)) {
      amounts.push(denom)
    }
  }

  return amounts.sort((a, b) => a - b)
}
