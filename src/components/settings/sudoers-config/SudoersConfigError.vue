<template>
  <div class="flex flex-col items-center py-6 space-y-4">
    <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
      <span class="text-red-400 text-3xl">!</span>
    </div>
    <h3 class="text-xl font-bold text-white">Erreur de configuration</h3>
    <p class="text-gray-400 text-center text-sm">
      Une erreur est survenue lors de la configuration sudoers.<br />
      Merci de vérifier votre mot de passe ou les droits d'accès.<br />
      <slot name="details" />
    </p>
  </div>
</template>
<script setup lang="ts">
// Pure error step
</script>
