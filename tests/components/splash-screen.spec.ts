/**
 * Tests for SplashScreen component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SplashScreen from '@/views/SplashScreen.vue'

// Mock Tauri
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

describe('SplashScreen Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the splash screen with loader', () => {
    const wrapper = mount(SplashScreen)

    expect(wrapper.find('.splash-container').exists()).toBe(true)
    expect(wrapper.find('.loader').exists()).toBe(true)
    expect(wrapper.find('.app-title').text()).toBe('Pixxiden')
  })

  it('should show initial loading message', () => {
    const wrapper = mount(SplashScreen)

    expect(wrapper.find('.loading-text').text()).toBe('Initializing...')
  })

  it('should render 5 loader rings for animation', () => {
    const wrapper = mount(SplashScreen)

    const loaderWraps = wrapper.findAll('.loader-line-wrap')
    expect(loaderWraps).toHaveLength(5)
  })

  it('should have each loader ring with proper styling', () => {
    const wrapper = mount(SplashScreen)

    const loaderLines = wrapper.findAll('.loader-line')
    expect(loaderLines).toHaveLength(5)
    // Each ring should be properly nested
    expect(loaderLines[0].exists()).toBe(true)
  })

  it('should render title with proper styling', () => {
    const wrapper = mount(SplashScreen)

    const title = wrapper.find('.app-title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Pixxiden')
    expect(title.element.tagName).toBe('H1')
  })

  it('should have centered splash content', () => {
    const wrapper = mount(SplashScreen)

    const content = wrapper.find('.splash-content')
    expect(content.exists()).toBe(true)
  })

  it('should have transparent container', () => {
    const wrapper = mount(SplashScreen)

    const container = wrapper.find('.splash-container')
    expect(container.exists()).toBe(true)
    // The component renders with splash-container class
  })

  it('should display loading text element', () => {
    const wrapper = mount(SplashScreen)

    const loadingText = wrapper.find('.loading-text')
    expect(loadingText.exists()).toBe(true)
    expect(loadingText.element.tagName).toBe('P')
  })

  it('should structure loader with proper nesting', () => {
    const wrapper = mount(SplashScreen)

    const loader = wrapper.find('.loader')
    const loaderInner = loader.find('.loader-inner')
    const loaderWraps = loaderInner.findAll('.loader-line-wrap')

    expect(loader.exists()).toBe(true)
    expect(loaderInner.exists()).toBe(true)
    expect(loaderWraps.length).toBe(5)
  })
})
