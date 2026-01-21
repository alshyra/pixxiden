import { createRouter, createWebHistory } from 'vue-router'
import LibraryView from '@/views/LibraryView.vue'

const routes = [
  {
    path: '/',
    name: 'library',
    component: LibraryView,
  },
  {
    path: '/game/:id',
    name: 'game-detail',
    component: () => import('@/views/GameDetailView.vue'),
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
