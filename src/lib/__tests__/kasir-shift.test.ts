import { describe, expect, it, vi } from 'vitest'
import { getNextShiftNumber, nextShiftNumber, shiftLabel } from '../kasir-shift'

describe('nextShiftNumber', () => {
  it('starts at shift 1 when no shift exists', () => {
    expect(nextShiftNumber(null)).toBe(1)
    expect(nextShiftNumber(undefined)).toBe(1)
    expect(nextShiftNumber(0)).toBe(1)
  })

  it('rotates 1 -> 2 -> 3 -> 1 without a daily reset', () => {
    expect(nextShiftNumber(1)).toBe(2)
    expect(nextShiftNumber(2)).toBe(3)
    expect(nextShiftNumber(3)).toBe(1)
  })
})

describe('shiftLabel', () => {
  it('labels shifts by their stored number', () => {
    expect(shiftLabel(1)).toBe('Shift 1')
    expect(shiftLabel(3)).toBe('Shift 3')
  })
})

describe('getNextShiftNumber', () => {
  it('reads the latest shift number from the database', async () => {
    const findFirst = vi.fn().mockResolvedValue({ nomor: 2 })
    const db = { kasirShift: { findFirst } } as never

    await expect(getNextShiftNumber(db, 'warung1')).resolves.toBe(3)
    expect(findFirst).toHaveBeenCalledWith({
      where: { warungId: 'warung1' },
      orderBy: [{ dibukaPada: 'desc' }, { createdAt: 'desc' }],
      select: { nomor: true },
    })
  })

  it('starts at shift 1 when the outlet has no shifts yet', async () => {
    const db = { kasirShift: { findFirst: vi.fn().mockResolvedValue(null) } } as never

    await expect(getNextShiftNumber(db, 'warung1')).resolves.toBe(1)
  })
})
