<script setup lang="ts">
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'

const showMenu = ref(false)
const showConfirm = ref(false)
const confirmAction = ref<'poweroff' | 'reboot' | 'logout' | null>(null)

function toggleMenu() {
  showMenu.value = !showMenu.value
}

function requestAction(action: 'poweroff' | 'reboot' | 'logout') {
  confirmAction.value = action
  showConfirm.value = true
  showMenu.value = false
}

function cancelAction() {
  showConfirm.value = false
  confirmAction.value = null
}

async function confirmActionExec() {
  if (!confirmAction.value) return

  console.log(`🔌 Action système: ${confirmAction.value}`)

  try {
    // Appeler une commande Tauri qui exécutera les commandes système
    await invoke('system_action', { action: confirmAction.value })
  } catch (error) {
    console.error('❌ Erreur action système:', error)
  }

  showConfirm.value = false
  confirmAction.value = null
}

// Fermer le menu si on clique ailleurs
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.system-menu-container')) {
    showMenu.value = false
  }
}
</script>

<template>
  <div class="system-menu-container relative" @click.stop>
    <!-- Bouton d'accès -->
    <button
      @click="toggleMenu"
      class="p-3 rounded-lg hover:bg-gray-700 transition-colors"
      :class="{ 'bg-gray-700': showMenu }"
      title="Menu système"
    >
      <svg
        class="w-6 h-6 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>

    <!-- Menu déroulant -->
    <Transition name="menu">
      <div
        v-if="showMenu"
        class="absolute top-full right-0 mt-2 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden z-50"
      >
        <button
          @click="requestAction('logout')"
          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
        >
          <svg class="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <div>
            <div class="text-white font-medium">Se déconnecter</div>
            <div class="text-gray-400 text-xs">Retour à l'écran de login</div>
          </div>
        </button>

        <button
          @click="requestAction('reboot')"
          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left border-t border-gray-700"
        >
          <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <div class="text-white font-medium">Redémarrer</div>
            <div class="text-gray-400 text-xs">Reboot du système</div>
          </div>
        </button>

        <button
          @click="requestAction('poweroff')"
          class="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left border-t border-gray-700"
        >
          <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div>
            <div class="text-white font-medium">Éteindre</div>
            <div class="text-gray-400 text-xs">Arrêt du système</div>
          </div>
        </button>
      </div>
    </Transition>

    <!-- Dialog de confirmation -->
    <Transition name="fade">
      <div
        v-if="showConfirm"
        class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
        @click="cancelAction"
      >
        <div
          class="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700"
          @click.stop
        >
          <div class="flex items-center gap-4 mb-4">
            <div
              class="w-12 h-12 rounded-full flex items-center justify-center"
              :class="{
                'bg-yellow-500/20': confirmAction === 'logout',
                'bg-blue-500/20': confirmAction === 'reboot',
                'bg-red-500/20': confirmAction === 'poweroff',
              }"
            >
              <svg
                v-if="confirmAction === 'logout'"
                class="w-6 h-6 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <svg
                v-if="confirmAction === 'reboot'"
                class="w-6 h-6 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <svg
                v-if="confirmAction === 'poweroff'"
                class="w-6 h-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-white">
                {{
                  confirmAction === 'logout' ? 'Se déconnecter' :
                  confirmAction === 'reboot' ? 'Redémarrer' :
                  'Éteindre'
                }}
              </h3>
              <p class="text-gray-400 text-sm mt-1">
                {{
                  confirmAction === 'logout' ? 'Fermer tous les jeux et retourner à l\'écran de login ?' :
                  confirmAction === 'reboot' ? 'Redémarrer le système maintenant ?' :
                  'Éteindre complètement le système ?'
                }}
              </p>
            </div>
          </div>

          <div class="flex gap-3 mt-6">
            <button
              @click="cancelAction"
              class="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
            >
              Annuler
            </button>
            <button
              @click="confirmActionExec"
              class="flex-1 px-4 py-3 rounded-lg transition-colors font-medium"
              :class="{
                'bg-yellow-600 hover:bg-yellow-700 text-white': confirmAction === 'logout',
                'bg-blue-600 hover:bg-blue-700 text-white': confirmAction === 'reboot',
                'bg-red-600 hover:bg-red-700 text-white': confirmAction === 'poweroff',
              }"
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* Animations du menu */
.menu-enter-active,
.menu-leave-active {
  transition: all 0.2s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Animations du dialog */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .bg-gray-800,
.fade-leave-active .bg-gray-800 {
  transition: transform 0.3s ease;
}

.fade-enter-from .bg-gray-800 {
  transform: scale(0.95);
}

.fade-leave-to .bg-gray-800 {
  transform: scale(0.95);
}
</style>
