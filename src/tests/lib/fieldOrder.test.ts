import { describe, it, expect } from 'vitest'
import { moveFieldInArray } from '../../lib/utils/fieldOrder'

describe('moveFieldInArray', () => {
  const arr = ['a', 'b', 'c', 'd']

  it('上方向に移動できる', () => {
    expect(moveFieldInArray(arr, 2, 'up')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('下方向に移動できる', () => {
    expect(moveFieldInArray(arr, 1, 'down')).toEqual(['a', 'c', 'b', 'd'])
  })

  it('先頭要素を上に移動しても変化しない', () => {
    expect(moveFieldInArray(arr, 0, 'up')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('末尾要素を下に移動しても変化しない', () => {
    expect(moveFieldInArray(arr, 3, 'down')).toEqual(['a', 'b', 'c', 'd'])
  })

  it('元の配列を変更しない（immutable）', () => {
    const original = ['x', 'y', 'z']
    moveFieldInArray(original, 0, 'down')
    expect(original).toEqual(['x', 'y', 'z'])
  })
})
