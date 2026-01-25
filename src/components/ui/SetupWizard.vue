<template>
  <div class="setup-wizard fixed inset-0 bg-black z-[9999] flex items-center justify-center">
    <!-- Background gradient -->
    <div class="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-black to-[#16213e] opacity-90" />
    
    <!-- Content -->
    <div class="relative z-10 w-full max-w-2xl mx-4">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-3 mb-8">
        <PixxidenLogo :size="48" :glow="true" />
        <span class="text-3xl font-bold italic text-white">Pixxiden</span>
      </div>
      
      <!-- Progress indicators -->
      <div class="flex justify-center gap-2 mb-8">
        <div 
          v-for="step in totalSteps" 
          :key="step"
          class="w-3 h-3 rounded-full transition-all duration-300"
          :class="[
            currentStep === step ? 'bg-[#5e5ce6] scale-110' : 
            currentStep > step ? 'bg-[#5e5ce6]/50' : 'bg-white/20'
          ]"
        />
      </div>
      
      <!-- Step content -->
      <div class="bg-[#0f0f12]/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <!-- Step 1: Welcome -->
        <Transition name="fade" mode="out-in">
          <div v-if="currentStep === 1" key="step1" class="p-8">
            <h2 class="text-2xl font-bold text-white mb-4 text-center">
              Bienvenue sur Pixxiden 🎮
            </h2>
            <p class="text-white/60 text-center mb-6">
              Pour enrichir votre bibliothèque avec des images et métadonnées de jeux,
              vous pouvez configurer des clés API optionnelles.
            </p>
            
            <div class="bg-[#5e5ce6]/10 border border-[#5e5ce6]/30 rounded-xl p-4 mb-6">
              <div class="flex items-start gap-3">
                <span class="text-xl">ℹ️</span>
                <div class="text-sm text-white/70">
                  <p class="font-semibold text-white mb-1">Ces clés sont optionnelles</p>
                  <p>Sans clés API, Pixxiden fonctionnera normalement mais sans images enrichies ni métadonnées détaillées.</p>
                </div>
              </div>
            </div>
            
            <div class="flex gap-4 justify-center">
              <Button variant="ghost" size="lg" @click="handleSkip">
                Passer la configuration
              </Button>
              <Button variant="primary" size="lg" @click="nextStep">
                Configurer les clés API
              </Button>
            </div>
          </div>
        </Transition>
        
        <!-- Step 2: SteamGridDB -->
        <Transition name="fade" mode="out-in">
          <div v-if="currentStep === 2" key="step2" class="p-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl">
                🎨
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">SteamGridDB</h2>
                <p class="text-sm text-white/50">Images et artwork des jeux</p>
              </div>
            </div>
            
            <div class="space-y-4 mb-6">
              <div class="bg-[#1a1a1f] rounded-xl p-4">
                <h3 class="text-sm font-semibold text-white/80 mb-2">Comment obtenir la clé ?</h3>
                <ol class="text-sm text-white/60 space-y-2 list-decimal list-inside">
                  <li>Visitez <a href="https://www.steamgriddb.com" target="_blank" class="text-[#5e5ce6] hover:underline">steamgriddb.com</a></li>
                  <li>Créez un compte ou connectez-vous</li>
                  <li>Allez dans <strong>Preferences</strong> → <strong>API</strong></li>
                  <li>Générez une nouvelle clé API</li>
                </ol>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                  Clé API SteamGridDB
                </label>
                <input
                  v-model="formData.steamgriddbApiKey"
                  type="password"
                  placeholder="Votre clé API SteamGridDB..."
                  class="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                />
              </div>
              
              <div v-if="testResults.steamgriddbMessage" class="text-sm" :class="testResults.steamgriddbValid ? 'text-green-400' : 'text-red-400'">
                {{ testResults.steamgriddbMessage }}
              </div>
            </div>
            
            <div class="flex gap-4 justify-between">
              <Button variant="ghost" @click="prevStep">← Retour</Button>
              <div class="flex gap-2">
                <Button variant="outline" @click="testCurrentStep" :loading="testing">
                  Tester
                </Button>
                <Button variant="primary" @click="nextStep">
                  {{ formData.steamgriddbApiKey ? 'Suivant' : 'Passer' }} →
                </Button>
              </div>
            </div>
          </div>
        </Transition>
        
        <!-- Step 3: IGDB -->
        <Transition name="fade" mode="out-in">
          <div v-if="currentStep === 3" key="step3" class="p-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">IGDB (Twitch)</h2>
                <p class="text-sm text-white/50">Métadonnées et informations des jeux</p>
              </div>
            </div>
            
            <div class="space-y-4 mb-6">
              <div class="bg-[#1a1a1f] rounded-xl p-4">
                <h3 class="text-sm font-semibold text-white/80 mb-2">Comment obtenir les identifiants ?</h3>
                <ol class="text-sm text-white/60 space-y-2 list-decimal list-inside">
                  <li>Visitez <a href="https://dev.twitch.tv/console" target="_blank" class="text-[#5e5ce6] hover:underline">dev.twitch.tv/console</a></li>
                  <li>Connectez-vous avec votre compte Twitch</li>
                  <li>Créez une nouvelle application</li>
                  <li>Copiez le <strong>Client ID</strong> et générez un <strong>Client Secret</strong></li>
                </ol>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                  Client ID
                </label>
                <input
                  v-model="formData.igdbClientId"
                  type="text"
                  placeholder="Client ID Twitch/IGDB..."
                  class="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                  Client Secret
                </label>
                <input
                  v-model="formData.igdbClientSecret"
                  type="password"
                  placeholder="Client Secret Twitch/IGDB..."
                  class="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                />
              </div>
              
              <div v-if="testResults.igdbMessage" class="text-sm" :class="testResults.igdbValid ? 'text-green-400' : 'text-red-400'">
                {{ testResults.igdbMessage }}
              </div>
            </div>
            
            <div class="flex gap-4 justify-between">
              <Button variant="ghost" @click="prevStep">← Retour</Button>
              <div class="flex gap-2">
                <Button variant="outline" @click="testCurrentStep" :loading="testing">
                  Tester
                </Button>
                <Button variant="primary" @click="nextStep">
                  {{ (formData.igdbClientId && formData.igdbClientSecret) ? 'Suivant' : 'Passer' }} →
                </Button>
              </div>
            </div>
          </div>
        </Transition>
        
        <!-- Step 4: Steam API -->
        <Transition name="fade" mode="out-in">
          <div v-if="currentStep === 4" key="step4" class="p-8">
            <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl">
                🏆
              </div>
              <div>
                <h2 class="text-xl font-bold text-white">Steam Web API</h2>
                <p class="text-sm text-white/50">Succès et statistiques Steam</p>
              </div>
            </div>
            
            <div class="space-y-4 mb-6">
              <div class="bg-[#1a1a1f] rounded-xl p-4">
                <h3 class="text-sm font-semibold text-white/80 mb-2">Comment obtenir la clé ?</h3>
                <ol class="text-sm text-white/60 space-y-2 list-decimal list-inside">
                  <li>Visitez <a href="https://steamcommunity.com/dev/apikey" target="_blank" class="text-[#5e5ce6] hover:underline">steamcommunity.com/dev/apikey</a></li>
                  <li>Connectez-vous avec votre compte Steam</li>
                  <li>Enregistrez un nom de domaine (ex: "localhost")</li>
                  <li>Copiez votre clé API</li>
                </ol>
                
                <h3 class="text-sm font-semibold text-white/80 mb-2 mt-4">Steam ID</h3>
                <p class="text-sm text-white/60">
                  Votre Steam ID 64-bit. Vous pouvez le trouver sur 
                  <a href="https://steamid.io" target="_blank" class="text-[#5e5ce6] hover:underline">steamid.io</a>
                </p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                  Clé API Steam
                </label>
                <input
                  v-model="formData.steamApiKey"
                  type="password"
                  placeholder="Votre clé API Steam..."
                  class="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-white/70 mb-2">
                  Steam ID (64-bit)
                </label>
                <input
                  v-model="formData.steamId"
                  type="text"
                  placeholder="76561198xxxxxxxxx"
                  class="w-full px-4 py-3 bg-[#1a1a1f] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#5e5ce6] transition-colors"
                />
              </div>
              
              <div v-if="testResults.steamMessage" class="text-sm" :class="testResults.steamValid ? 'text-green-400' : 'text-red-400'">
                {{ testResults.steamMessage }}
              </div>
            </div>
            
            <div class="flex gap-4 justify-between">
              <Button variant="ghost" @click="prevStep">← Retour</Button>
              <div class="flex gap-2">
                <Button variant="outline" @click="testCurrentStep" :loading="testing">
                  Tester
                </Button>
                <Button variant="primary" @click="nextStep">
                  {{ (formData.steamApiKey && formData.steamId) ? 'Suivant' : 'Passer' }} →
                </Button>
              </div>
            </div>
          </div>
        </Transition>
        
        <!-- Step 5: Summary -->
        <Transition name="fade" mode="out-in">
          <div v-if="currentStep === 5" key="step5" class="p-8">
            <h2 class="text-2xl font-bold text-white mb-6 text-center">
              Configuration terminée 🎉
            </h2>
            
            <div class="space-y-3 mb-8">
              <div class="flex items-center justify-between p-4 bg-[#1a1a1f] rounded-xl">
                <div class="flex items-center gap-3">
                  <span class="text-xl">🎨</span>
                  <span class="text-white">SteamGridDB</span>
                </div>
                <span :class="formData.steamgriddbApiKey ? 'text-green-400' : 'text-white/40'">
                  {{ formData.steamgriddbApiKey ? '✓ Configuré' : '✗ Non configuré' }}
                </span>
              </div>
              
              <div class="flex items-center justify-between p-4 bg-[#1a1a1f] rounded-xl">
                <div class="flex items-center gap-3">
                  <span class="text-xl">📊</span>
                  <span class="text-white">IGDB</span>
                </div>
                <span :class="(formData.igdbClientId && formData.igdbClientSecret) ? 'text-green-400' : 'text-white/40'">
                  {{ (formData.igdbClientId && formData.igdbClientSecret) ? '✓ Configuré' : '✗ Non configuré' }}
                </span>
              </div>
              
              <div class="flex items-center justify-between p-4 bg-[#1a1a1f] rounded-xl">
                <div class="flex items-center gap-3">
                  <span class="text-xl">🏆</span>
                  <span class="text-white">Steam</span>
                </div>
                <span :class="(formData.steamApiKey && formData.steamId) ? 'text-green-400' : 'text-white/40'">
                  {{ (formData.steamApiKey && formData.steamId) ? '✓ Configuré' : '✗ Non configuré' }}
                </span>
              </div>
            </div>
            
            <p class="text-white/50 text-sm text-center mb-6">
              Vous pourrez modifier ces clés à tout moment dans les Paramètres.
            </p>
            
            <div class="flex justify-center">
              <Button variant="primary" size="lg" @click="handleFinish" :loading="saving">
                Commencer à jouer 🎮
              </Button>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import * as api from '@/services/api'
import { PixxidenLogo, Button } from '@/components/ui'

const emit = defineEmits<{
  complete: []
  skip: []
}>()

const totalSteps = 5
const currentStep = ref(1)
const testing = ref(false)
const saving = ref(false)

const formData = reactive({
  steamgriddbApiKey: '',
  igdbClientId: '',
  igdbClientSecret: '',
  steamApiKey: '',
  steamId: '',
})

const testResults = reactive({
  steamgriddbValid: false,
  steamgriddbMessage: null as string | null,
  igdbValid: false,
  igdbMessage: null as string | null,
  steamValid: false,
  steamMessage: null as string | null,
})

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function testCurrentStep() {
  testing.value = true
  
  try {
    const results = await api.testApiKeys({
      steamgriddbApiKey: formData.steamgriddbApiKey || undefined,
      igdbClientId: formData.igdbClientId || undefined,
      igdbClientSecret: formData.igdbClientSecret || undefined,
      steamApiKey: formData.steamApiKey || undefined,
      steamId: formData.steamId || undefined,
    })
    
    testResults.steamgriddbValid = results.steamgriddbValid
    testResults.steamgriddbMessage = results.steamgriddbMessage
    testResults.igdbValid = results.igdbValid
    testResults.igdbMessage = results.igdbMessage
    testResults.steamValid = results.steamValid
    testResults.steamMessage = results.steamMessage
  } catch (error) {
    console.error('Test failed:', error)
  } finally {
    testing.value = false
  }
}

async function handleSkip() {
  try {
    await api.skipSetup()
    emit('skip')
  } catch (error) {
    console.error('Failed to skip setup:', error)
  }
}

async function handleFinish() {
  saving.value = true
  
  try {
    await api.saveApiKeys({
      steamgriddbApiKey: formData.steamgriddbApiKey || null,
      igdbClientId: formData.igdbClientId || null,
      igdbClientSecret: formData.igdbClientSecret || null,
      steamApiKey: formData.steamApiKey || null,
      steamId: formData.steamId || null,
      markSetupCompleted: true,
    })
    
    emit('complete')
  } catch (error) {
    console.error('Failed to save API keys:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}
</style>
