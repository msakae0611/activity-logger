import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { DynamicForm } from '../../../features/recording/DynamicForm'
import type { FieldDefinition, ItemListSubField } from '../../../types'

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
  it('項目名のボタンを表示する', () => {
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

  it('展開時に入力済み値と合計が表示される', async () => {
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
    // 初期状態は折りたたみ → クリックで展開
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('15')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
  })

  it('展開中に再タップすると折りたたむ（onChangeは呼ばれない）', async () => {
    const onChange = vi.fn()
    // 選択済みの初期値を渡すことで、クリック時に values が空のまま再選択される問題を回避
    const values = { machines: [{ name: 'レッグプレス' }] }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={onChange} />)
    // タップ1: 折りたたみ→展開（選択済みなのでonChangeは呼ばれない）
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(screen.getByPlaceholderText('レベル')).toBeInTheDocument()
    onChange.mockClear()
    // タップ2: 展開→折りたたみ（onChangeは呼ばれない）
    await userEvent.click(screen.getByText('レッグプレス'))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByPlaceholderText('レベル')).not.toBeInTheDocument()
  })

  it('×ボタンをクリックで選択解除する', async () => {
    const onChange = vi.fn()
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'レッグプレスを削除' }))
    expect(onChange).toHaveBeenCalledWith({ machines: [] })
  })

  it('折りたたみ時にサマリー文字列を表示する', () => {
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
    // 初期状態は折りたたみ: サマリーがボタン内に表示される
    expect(screen.getByText(/30 × 15 = 450/)).toBeInTheDocument()
  })

  it('折りたたみ時は入力欄を表示しない', () => {
    const values = {
      machines: [{ name: 'レッグプレス', weight: 30, reps: 15, total: 450 }],
    }
    render(<DynamicForm fields={[itemListField]} values={values} onChange={() => {}} />)
    // 初期状態は折りたたみ
    expect(screen.queryByPlaceholderText('レベル')).not.toBeInTheDocument()
  })
})
