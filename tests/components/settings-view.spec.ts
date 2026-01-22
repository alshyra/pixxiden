/**
 * Tests for Settings View
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsView from '@/views/SettingsView.vue'
import * as api from '@/services/api'

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

// Mock API module
vi.mock('@/services/api', () => ({
  getSystemInfo: vi.fn(),
  getDiskInfo: vi.fn(),
  getStoreStatus: vi.fn(),
  getSettings: vi.fn(),
  checkForUpdates: vi.fn(),
  shutdownSystem: vi.fn(),
  saveSettings: vi.fn(),
}))

const mockSystemInfo = {
  osName: 'PixxOS',
  osVersion: 'Arch Linux',
  kernelVersion: '6.7.2-zen1-1-zen',
  cpuBrand: 'AMD Custom APU (Aerith)',
  totalMemory: 16777216000, // ~16GB
  hostname: 'pixxiden-dev',
}

const mockDiskInfo = [
  {
    name: '/dev/nvme0n1p1',
    mountPoint: '/',
    totalSpace: 512000000000, // ~512GB
    availableSpace: 256000000000, // ~256GB
    usedSpace: 256000000000,
    fileSystem: 'ext4',
    isRemovable: false,
  },
]

const mockStoreStatus = [
  { name: 'epic', available: true, authenticated: true },
  { name: 'gog', available: true, authenticated: false },
  { name: 'amazon', available: true, authenticated: true },
]

const mockSettings = {
  protonVersion: 'GE-Proton8-32',
  mangoHudEnabled: false,
  defaultInstallPath: '~/Games',
  winePrefixPath: '~/.local/share/pixxiden/prefixes',
}

describe('SettingsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    
    // Setup API mocks
    vi.mocked(api.getSystemInfo).mockResolvedValue(mockSystemInfo)
    vi.mocked(api.getDiskInfo).mockResolvedValue(mockDiskInfo)
    vi.mocked(api.getStoreStatus).mockResolvedValue(mockStoreStatus)
    vi.mocked(api.getSettings).mockResolvedValue(mockSettings)
    vi.mocked(api.checkForUpdates).mockResolvedValue(false)
    vi.mocked(api.saveSettings).mockResolvedValue(undefined)
    
    // Mock window.alert and confirm
    global.alert = vi.fn()
    global.confirm = vi.fn(() => true)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      const wrapper = mount(SettingsView)
      expect(wrapper.exists()).toBe(true)
    })

    it('should have Pixxiden logo', () => {
      const wrapper = mount(SettingsView)
      expect(wrapper.text()).toContain('Pixxiden')
    })

    it('should have version badge', () => {
      const wrapper = mount(SettingsView)
      expect(wrapper.text()).toContain('v0.1.0-alpha')
    })
  })

  describe('Navigation', () => {
    it('should have three navigation sections', () => {
      const wrapper = mount(SettingsView)
      const navButtons = wrapper.findAll('[role="tab"]')
      expect(navButtons).toHaveLength(3)
      expect(navButtons[0].text()).toBe('Système')
      expect(navButtons[1].text()).toBe('Comptes')
      expect(navButtons[2].text()).toBe('Avancé')
    })

    it('should start with Système section active', () => {
      const wrapper = mount(SettingsView)
      const activeButton = wrapper.find('[role="tab"][aria-selected="true"]')
      expect(activeButton.text()).toBe('Système')
    })

    it('should switch sections when clicking navigation', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const comptesButton = wrapper.findAll('[role="tab"]')[1]
      await comptesButton.trigger('click')

      const activeButton = wrapper.find('[role="tab"][aria-selected="true"]')
      expect(activeButton.text()).toBe('Comptes')
      expect(wrapper.text()).toContain('Connectez vos stores')
    })
  })

  describe('Système Section', () => {
    it('should load system information on mount', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      expect(api.getSystemInfo).toHaveBeenCalled()
      expect(api.getDiskInfo).toHaveBeenCalled()
    })

    it('should display system information', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      expect(wrapper.text()).toContain('PixxOS')
      expect(wrapper.text()).toContain('6.7.2-zen1-1-zen')
      expect(wrapper.text()).toContain('AMD Custom APU')
    })

    it('should display disk information', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      expect(wrapper.text()).toContain('Stockage')
      expect(wrapper.text()).toContain('/')
    })

    it('should check for updates when button clicked', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const updateButton = wrapper.find('button[class*="VÉRIFIER"]')
      await updateButton.trigger('click')
      await flushPromises()

      expect(api.checkForUpdates).toHaveBeenCalled()
      expect(global.alert).toHaveBeenCalledWith('Aucune mise à jour disponible')
    })

    it('should confirm before shutdown', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const shutdownButton = wrapper.find('button:has(text("ÉTEINDRE"))')
      if (shutdownButton.exists()) {
        await shutdownButton.trigger('click')
        expect(global.confirm).toHaveBeenCalled()
      }
    })
  })

  describe('Comptes Section', () => {
    it('should load store status on mount', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      expect(api.getStoreStatus).toHaveBeenCalled()
    })

    it('should display store accounts', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const comptesButton = wrapper.findAll('[role="tab"]')[1]
      await comptesButton.trigger('click')

      expect(wrapper.text()).toContain('Epic Games')
      expect(wrapper.text()).toContain('GOG')
      expect(wrapper.text()).toContain('Amazon Games')
    })

    it('should show authentication status', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const comptesButton = wrapper.findAll('[role="tab"]')[1]
      await comptesButton.trigger('click')

      expect(wrapper.text()).toContain('CONNECTÉ')
      expect(wrapper.text()).toContain('DÉCONNECTÉ')
    })
  })

  describe('Avancé Section', () => {
    it('should load settings on mount', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      expect(api.getSettings).toHaveBeenCalled()
    })

    it('should display Proton version selector', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const avanceButton = wrapper.findAll('[role="tab"]')[2]
      await avanceButton.trigger('click')

      expect(wrapper.text()).toContain('Version Proton Global')
      const select = wrapper.find('select[aria-label="Select Proton version"]')
      expect(select.exists()).toBe(true)
    })

    it('should display MangoHud toggle', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const avanceButton = wrapper.findAll('[role="tab"]')[2]
      await avanceButton.trigger('click')

      expect(wrapper.text()).toContain('Overlay MangoHud')
      const toggle = wrapper.find('[role="switch"]')
      expect(toggle.exists()).toBe(true)
    })

    it('should save settings when save button clicked', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const avanceButton = wrapper.findAll('[role="tab"]')[2]
      await avanceButton.trigger('click')

      const saveButton = wrapper.find('button:has(text("SAUVEGARDER"))')
      if (saveButton.exists()) {
        await saveButton.trigger('click')
        await flushPromises()

        expect(api.saveSettings).toHaveBeenCalled()
        expect(global.alert).toHaveBeenCalledWith('Paramètres sauvegardés')
      }
    })

    it('should toggle MangoHud when switch clicked', async () => {
      const wrapper = mount(SettingsView)
      await flushPromises()

      const avanceButton = wrapper.findAll('[role="tab"]')[2]
      await avanceButton.trigger('click')

      const toggle = wrapper.find('[role="switch"]')
      const initialState = toggle.attributes('aria-checked')
      
      await toggle.trigger('click')
      await flushPromises()

      const newState = toggle.attributes('aria-checked')
      expect(newState).not.toBe(initialState)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA roles', () => {
      const wrapper = mount(SettingsView)
      
      expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
      expect(wrapper.findAll('[role="tab"]')).toHaveLength(3)
      expect(wrapper.find('[role="tabpanel"]').exists()).toBe(true)
    })

    it('should have aria-selected on active tab', async () => {
      const wrapper = mount(SettingsView)
      const tabs = wrapper.findAll('[role="tab"]')
      
      expect(tabs[0].attributes('aria-selected')).toBe('true')
      expect(tabs[1].attributes('aria-selected')).toBe('false')
      expect(tabs[2].attributes('aria-selected')).toBe('false')
    })

    it('should have aria-controls on tabs', () => {
      const wrapper = mount(SettingsView)
      const tabs = wrapper.findAll('[role="tab"]')
      
      expect(tabs[0].attributes('aria-controls')).toBe('panel-systeme')
      expect(tabs[1].attributes('aria-controls')).toBe('panel-comptes')
      expect(tabs[2].attributes('aria-controls')).toBe('panel-avance')
    })
  })

  describe('Error Handling', () => {
    it('should handle system info loading errors', async () => {
      vi.mocked(api.getSystemInfo).mockRejectedValue(new Error('Failed to load'))
      
      const wrapper = mount(SettingsView)
      await flushPromises()

      // Should not crash
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle update check errors', async () => {
      vi.mocked(api.checkForUpdates).mockRejectedValue(new Error('Failed'))
      
      const wrapper = mount(SettingsView)
      await flushPromises()

      const updateButton = wrapper.find('button[class*="VÉRIFIER"]')
      await updateButton.trigger('click')
      await flushPromises()

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Erreur')
      )
    })

    it('should handle save settings errors', async () => {
      vi.mocked(api.saveSettings).mockRejectedValue(new Error('Failed'))
      
      const wrapper = mount(SettingsView)
      await flushPromises()

      const avanceButton = wrapper.findAll('[role="tab"]')[2]
      await avanceButton.trigger('click')

      const saveButton = wrapper.find('button:has(text("SAUVEGARDER"))')
      if (saveButton.exists()) {
        await saveButton.trigger('click')
        await flushPromises()

        expect(global.alert).toHaveBeenCalledWith(
          expect.stringContaining('Erreur')
        )
      }
    })
  })
})
