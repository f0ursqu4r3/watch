import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ServiceMenu from './ServiceMenu.vue'
import { i18n } from '../i18n'

const providers = [
  { id: 8, name: 'Netflix', color: '#E50914', logoPath: null },
  { id: 15, name: 'Hulu', color: '#1CE783', logoPath: null },
  { id: 337, name: 'Disney+', color: '#1133A6', logoPath: null },
]

function mountMenu(selected = new Set<number>()) {
  return mount(ServiceMenu, {
    props: { providers, selected },
    global: { plugins: [i18n], stubs: { transition: true } },
    attachTo: document.body,
  })
}

describe('ServiceMenu', () => {
  beforeEach(() => { i18n.global.locale.value = 'en' })

  it('is closed initially', () => {
    const w = mountMenu()
    expect(w.find('.svc-popover').exists()).toBe(false)
  })

  it('opens the popover when the trigger is clicked', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    expect(w.find('.svc-popover').exists()).toBe(true)
  })

  it('renders one row per provider with check state from selected', async () => {
    const w = mountMenu(new Set([8]))
    await w.find('.add-btn').trigger('click')
    expect(w.findAll('.svc-row')).toHaveLength(3)
    expect(w.findAll('.svc-row.checked')).toHaveLength(1)
  })

  it('emits toggle with the provider id when a row is clicked', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    await w.findAll('.svc-row')[1]!.trigger('click')
    expect(w.emitted('toggle')).toBeTruthy()
    expect(w.emitted('toggle')![0]).toEqual([15])
  })

  it('filters rows by the search query (case-insensitive)', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    await w.find('.svc-search-input').setValue('DIS')
    const rows = w.findAll('.svc-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]!.text()).toContain('Disney+')
  })

  it('shows a clear button only when the query is non-empty, and clears on click', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    expect(w.find('.svc-search-clear').exists()).toBe(false)
    await w.find('.svc-search-input').setValue('dis')
    expect(w.findAll('.svc-row')).toHaveLength(1)
    expect(w.find('.svc-search-clear').exists()).toBe(true)
    await w.find('.svc-search-clear').trigger('click')
    expect((w.find('.svc-search-input').element as HTMLInputElement).value).toBe('')
    expect(w.findAll('.svc-row')).toHaveLength(3)
  })

  it('closes on Escape', async () => {
    const w = mountMenu()
    await w.find('.add-btn').trigger('click')
    expect(w.find('.svc-popover').exists()).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await w.vm.$nextTick()
    expect(w.find('.svc-popover').exists()).toBe(false)
  })
})
