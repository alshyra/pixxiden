import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import SplashScreen from './views/SplashScreen.vue'
import router from './router'
import './style.css'

// Check if we're in splash screen mode
const isSplashScreen = window.location.search.includes('splash')

// Create and mount the appropriate app
if (isSplashScreen) {
  const splashApp = createApp(SplashScreen)
  splashApp.mount('#app')
} else {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}
