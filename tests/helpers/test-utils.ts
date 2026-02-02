/**
 * Test utilities for Vue component testing
 * Provides common mocks and helpers
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

/**
 * Create a mock router for testing components that use Vue Router
 */
export function createMockRouter(initialRoute = "/settings/system") {
  const routes: RouteRecordRaw[] = [
    {
      path: "/",
      component: { template: "<div>Home</div>" },
    },
    {
      path: "/settings",
      component: { template: "<router-view />" },
      children: [
        {
          path: "system",
          component: { template: "<div>System Settings</div>" },
        },
        {
          path: "store",
          component: { template: "<div>Store Settings</div>" },
        },
        {
          path: "api-keys",
          component: { template: "<div>API Keys Settings</div>" },
        },
        {
          path: "advanced",
          component: { template: "<div>Advanced Settings</div>" },
        },
      ],
    },
    {
      path: "/game/:id",
      component: { template: "<div>Game Details</div>" },
    },
  ];

  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  // Navigate to initial route
  router.push(initialRoute);

  return router;
}

/**
 * Common global plugins for mounting components
 */
export function getGlobalPlugins(router = createMockRouter()) {
  return {
    plugins: [router],
    stubs: {
      // Stub any problematic components if needed
    },
  };
}
