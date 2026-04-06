import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DynamicForm } from '../../../features/recording/DynamicForm'
import type { FieldDefinition } from '../../../types'
import type { ItemListSubField } from '../../../types'

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

const itemListField: FieldDefinition = {
  key: 'machines',
  label: 'マシン',
  type: 'item-list',
  options: ['レッグプレス', 'チェストプレス'],
  subFields: [
    { key: 'weight', label: 'レベル' },
    { key: 'reps', label: '回数' },
  ] as ItemListSubField[],
  computedTotal: true,
}

describe('DynamicForm - item-list', () => {
  it('項目名のピルボタンを表示する', () => {
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={() => {}} />)
    expect(screen.getByText('レッグプレス')).toBeInTheDocument()
    expect(screen.getByText('チェストプレス')).toBeInTheDocument()
  })

  it('項目を選択するとサブフィールド入力欄が展開する', async () => {
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={() => {}} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByPlaceholderText('レベル')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('回数')).toBeInTheDocument()
  })

  it('サブフィールドに値を入力するとonChangeが呼ばれる', async () => {
    const onChange = vi.fn()
    render(<DynamicForm fields={[itemListField]} values={{}} onChange={onChange} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    await userEvent.type(screen.getByPlaceholderText('レベル'), '30')
    expect(onChange).toHaveBeenCalled()
  })

  it('両サブフィールドが入力済みのとき合計を表示する', async () => {
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByText(/合計.*450/)).toBeInTheDocument()
  })

  it('項目を再タップで選択解除するとonChangeで項目が除去される', async () => {
    const onChange = vi.fn()
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={onChange} />)
    // 選択済み項目を再タップ
    await userEvent.click(screen.getByText('レッグプレス'))
    await userEvent.click(screen.getByText('レッグプレス'))
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0]
    expect(lastCall.machines).toEqual([])
  })
})
