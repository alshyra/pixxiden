/**
 * Vue Module Declaration
 * Allows importing .vue files in TypeScript
 */

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}
