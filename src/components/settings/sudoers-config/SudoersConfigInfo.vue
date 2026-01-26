<template>
  <div>
    <h3 class="text-2xl font-black text-white italic tracking-tight mb-2">
      Configuration des mises à jour système
    </h3>
    <p class="text-gray-400 text-sm mb-6">
      Pour permettre les mises à jour système directement depuis Pixxiden, nous devons configurer
      votre système.
    </p>
    <ul class="space-y-3">
      <li>Créer une règle de sécurité pour Pixxiden</li>
      <li>Autoriser <strong>uniquement</strong> les commandes de mise à jour</li>
      <li>Fichier créé : <code class="text-[#5e5ce6]">/etc/sudoers.d/pixxiden</code></li>
    </ul>
  </div>
</template>
<script setup lang="ts">
// Pure info step
</script>
