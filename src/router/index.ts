import { createRouter, createWebHistory } from 'vue-router'
import LibraryFullscreen from '@/views/LibraryFullscreen.vue'
import SettingsView from '@/views/SettingsView.vue'
import GameDetails from '@/views/GameDetails.vue'
import GameOverlayWindow from '@/views/GameOverlayWindow.vue'

const routes = [
  {
    path: '/',
    name: 'library',
    component: LibraryFullscreen,
  },
  {
    path: '/library/grid',
    name: 'library-grid',
    component: () => import('@/views/LibraryGrid.vue'),
  },
  {
    path: '/game/:id',
    name: 'game-detail',
    component: GameDetails,
  },
  {
    path: '/overlay',
    name: 'game-overlay',
    component: GameOverlayWindow,
  },
  // TODO implement the dowloads view later
  // should be accessible from notif or settings
  // {
  //   path: '/downloads',
  //   name: 'downloads',
  //   component: () => import('@/views/DownloadsView.vue'),
  // },
  {
    path: '/settings',
    name: 'settings',
    component: SettingsView,
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
