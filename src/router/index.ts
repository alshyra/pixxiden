import GameDetails from "@/views/GameDetails.vue";
import GameOverlayWindow from "@/views/GameOverlayWindow.vue";
import LibraryFullscreen from "@/views/LibraryFullscreen.vue";
import SettingsView from "@/views/SettingsView.vue";
import { createRouter, createWebHistory } from "vue-router";
import {
  SettingsStore,
  SettingsAdvanced,
  SettingsApiKeys,
  SettingsSystem,
} from "@/components/settings";

const routes = [
  {
    path: "/",
    name: "library",
    component: LibraryFullscreen,
  },
  {
    path: "/game/:id",
    name: "game-detail",
    component: GameDetails,
  },
  {
    path: "/overlay",
    name: "game-overlay",
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
    path: "/settings/",
    component: SettingsView,
    children: [
      {
        path:'',
        name: "settings",
        redirect: '/settings/system',
      },
      {
        path: "system",
        component: SettingsSystem,
      },
      {
        path: "store",
        component: SettingsStore,
      },
      {
        path: "api-keys",
        component: SettingsApiKeys,
      },
      {
        path: "advanced",
        component: SettingsAdvanced,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
