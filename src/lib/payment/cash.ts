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

export interface SplitPaymentResult {
  isValid: boolean
  jumlahCash: number
  kembalian: number
  message: string
}

export function hitungSplitPembayaran(
  totalTagihan: number,
  jumlahTransfer: number,
  uangDiterima: number,
): SplitPaymentResult {
  const nominalValid = Number.isInteger(totalTagihan) && totalTagihan > 0 &&
    Number.isInteger(jumlahTransfer) && jumlahTransfer > 0 &&
    Number.isInteger(uangDiterima) && uangDiterima >= 0

  if (!nominalValid || jumlahTransfer >= totalTagihan) {
    return { isValid: false, jumlahCash: 0, kembalian: 0, message: 'Porsi transfer harus lebih kecil dari total tagihan.' }
  }

  const jumlahCash = totalTagihan - jumlahTransfer
  const cash = hitungKembalian(uangDiterima, jumlahCash)
  if (!cash.isValid) {
    return { isValid: false, jumlahCash, kembalian: 0, message: cash.message }
  }

  return { isValid: true, jumlahCash, kembalian: cash.kembalian, message: cash.message }
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
