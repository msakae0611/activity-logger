import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DynamicForm } from '../../../features/recording/DynamicForm'
import type { FieldDefinition } from '../../../types'

const fields: FieldDefinition[] = [
  { key: 'work_hours', label: '作業時間', type: 'number', unit: 'h' },
  { key: 'mood', label: '気分', type: 'select', options: ['良い', '普通', '悪い'] },
  { key: 'memo', label: 'メモ', type: 'textarea' },
]

describe('DynamicForm', () => {
  it('fieldsに対応するフォームを表示する', () => {
    render(<DynamicForm fields={fields} values={{}} onChange={() => {}} />)
    expect(screen.getByLabelText('作業時間')).toBeInTheDocument()
    expect(screen.getByLabelText('気分')).toBeInTheDocument()
    expect(screen.getByLabelText('メモ')).toBeInTheDocument()
  })

  it('入力変更時にonChangeが呼ばれる', async () => {
    const onChange = vi.fn()
    render(<DynamicForm fields={fields} values={{}} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('メモ'), 'テスト')
    expect(onChange).toHaveBeenCalled()
  })
})
