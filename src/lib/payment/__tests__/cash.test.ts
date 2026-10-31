import { describe, test, expect } from 'vitest'
import { hitungKembalian, generateQuickAmounts } from '../cash'

describe('hitungKembalian', () => {
  test('uang cukup - kembalian positif', () => {
    const result = hitungKembalian(50000, 47500)
    expect(result.isValid).toBe(true)
    expect(result.kembalian).toBe(2500)
    expect(result.isUangPas).toBe(false)
    expect(result.message).toContain('2.500')
  })

  test('uang pas - kembalian 0', () => {
    const result = hitungKembalian(47500, 47500)
    expect(result.isValid).toBe(true)
    expect(result.kembalian).toBe(0)
    expect(result.isUangPas).toBe(true)
    expect(result.message).toBe('Uang Pas')
  })

  test('uang kurang - invalid', () => {
    const result = hitungKembalian(40000, 47500)
    expect(result.isValid).toBe(false)
    expect(result.kembalian).toBe(0)
    expect(result.isUangPas).toBe(false)
    expect(result.message).toContain('Uang kurang')
    expect(result.message).toContain('7.500')
  })

  test('input negatif uangDiterima - invalid', () => {
    const result = hitungKembalian(-1000, 47500)
    expect(result.isValid).toBe(false)
    expect(result.message).toBe('Input tidak valid')
  })

  test('input negatif totalTagihan - invalid', () => {
    const result = hitungKembalian(50000, -1000)
    expect(result.isValid).toBe(false)
    expect(result.message).toBe('Input tidak valid')
  })

  test('kedua input 0 - valid', () => {
    const result = hitungKembalian(0, 0)
    expect(result.isValid).toBe(true)
    expect(result.kembalian).toBe(0)
    expect(result.isUangPas).toBe(true)
  })

  test('uang sangat lebih - kembalian besar', () => {
    const result = hitungKembalian(200000, 47500)
    expect(result.isValid).toBe(true)
    expect(result.kembalian).toBe(152500)
    expect(result.isUangPas).toBe(false)
  })

  test('uang kurang 1 rupiah - invalid', () => {
    const result = hitungKembalian(47499, 47500)
    expect(result.isValid).toBe(false)
    expect(result.message).toContain('Uang kurang')
  })
})

describe('generateQuickAmounts', () => {
  test('menghasilkan denominasi yang sesuai untuk total 47500', () => {
    const amounts = generateQuickAmounts(47500)
    expect(amounts).toContain(47500)
    expect(amounts).toContain(50000)
    expect(amounts).toContain(100000)
    expect(amounts).not.toContain(20000)
  })

  test('uang pas ada di list pertama', () => {
    const amounts = generateQuickAmounts(47500)
    expect(amounts[0]).toBe(47500)
  })

  test('total bulat - tidak ada duplikat', () => {
    const amounts = generateQuickAmounts(50000)
    expect(amounts[0]).toBe(50000)
    expect(amounts.filter(a => a === 50000)).toHaveLength(1)
  })

  test('total kecil - ada uang pas dan denominasi lebih besar', () => {
    const amounts = generateQuickAmounts(5000)
    expect(amounts[0]).toBe(5000)
    expect(amounts).toContain(10000)
    expect(amounts.filter(a => a === 5000)).toHaveLength(1)
  })

  test('total besar - beberapa denominasi', () => {
    const amounts = generateQuickAmounts(150000)
    expect(amounts).toContain(150000)
    expect(amounts.length).toBe(1)
  })

  test('total 0 - ada 0 dan semua denominasi', () => {
    const amounts = generateQuickAmounts(0)
    expect(amounts).toContain(0)
    expect(amounts).toContain(100000)
  })
})
