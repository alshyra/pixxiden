import { createRouter, createWebHistory } from 'vue-router'
import LibraryFullscreen from '@/views/LibraryFullscreen.vue'

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
    component: () => import('@/views/GameDetails.vue'),
  },
  {
    path: '/downloads',
    name: 'downloads',
    component: () => import('@/views/DownloadsView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
