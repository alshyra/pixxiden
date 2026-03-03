import LibraryLayout from "@/views/LibraryLayout.vue";
import LibraryContent from "@/views/LibraryContent.vue";
import GameDetailContent from "@/views/GameDetailContent.vue";
import GameCustomize from "@/views/GameCustomize.vue";
import GameOverlayWindow from "@/views/GameOverlayWindow.vue";
import SystemView from "@/views/SystemView.vue";
import AccountsView from "@/views/AccountsView.vue";
import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    component: LibraryLayout,
    children: [
      {
        path: "",
        name: "library",
        component: LibraryContent,
      },
      {
        path: "game/:id",
        name: "game-detail",
        component: GameDetailContent,
      },
      {
        path: "game/:id/customize",
        name: "game-customize",
        component: GameCustomize,
      },
    ],
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
