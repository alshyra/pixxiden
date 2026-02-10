import GameDetails from "@/views/GameDetails.vue";
import GameOverlayWindow from "@/views/GameOverlayWindow.vue";
import LibraryFullscreen from "@/views/LibraryFullscreen.vue";
import SystemView from "@/views/SystemView.vue";
import AccountsView from "@/views/AccountsView.vue";
import { createRouter, createWebHistory } from "vue-router";

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
  {
    path: "/downloads",
    name: "downloads",
    component: () => import("@/views/DownloadsView.vue"),
  },
  {
    path: "/system",
    name: "system",
    component: SystemView,
  },
  {
    path: "/accounts",
    name: "accounts",
    component: AccountsView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
