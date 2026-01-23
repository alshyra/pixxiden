import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import SplashScreen from './views/SplashScreen.vue'
import router from './router'
import './style.css'

// Check if we're in splash screen mode
const isSplashScreen = window.location.search.includes('splash')

// Remove temporary splash screen from index.html
const removeTmpSplash = () => {
  const tmpSplash = document.querySelector('.tmp-splash')
  if (tmpSplash) {
    tmpSplash.classList.add('fade-out')
    setTimeout(() => tmpSplash.remove(), 300)
  }
}

// Create and mount the appropriate app
if (isSplashScreen) {
  const splashApp = createApp(SplashScreen)
  splashApp.mount('#app')
  removeTmpSplash()
} else {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  
  // Expose router for E2E testing
  ;(window as any).__VUE_ROUTER__ = router
  
  app.mount('#app')
  removeTmpSplash()
}
