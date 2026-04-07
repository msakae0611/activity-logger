export function moveFieldInArray<T>(arr: T[], index: number, direction: 'up' | 'down'): T[] {
  if (direction === 'up' && index === 0) return arr
  if (direction === 'down' && index === arr.length - 1) return arr
  const next = [...arr]
  const swapWith = direction === 'up' ? index - 1 : index + 1
  ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
  return next
}
