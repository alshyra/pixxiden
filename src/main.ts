import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";


const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
app.use(router);

// Expose router and pinia for E2E testing
(window as any).__VUE_ROUTER__ = router;
(window as any).__PINIA__ = pinia;

app.mount("#app");
