<template>
  <Card variant="elevated" no-padding>
    <!-- Header avec cover et infos -->
    <div class="flex p-5 gap-5 border-b border-white/5 bg-white/2 items-center">
      <!-- Game Cover -->
      <div
        class="w-24 h-24 shrink-0 bg-[#1a1a1e] rounded-lg overflow-hidden border border-white/10 shadow-xl"
      >
        <img
          v-if="coverImage"
          :src="coverImage"
          :alt="game?.title"
          class="w-full h-full object-cover"
        />
        <div
          v-else
          class="w-full h-full bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 flex items-center justify-center"
        >
          <span class="text-4xl">🎮</span>
        </div>
      </div>

      <!-- Game Info -->
      <div class="flex-1 min-w-0">
        <h2 class="text-xl font-black italic tracking-tight text-white leading-tight truncate">
          {{ game?.title?.toUpperCase() || "N/A" }}
        </h2>
        <p class="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
          {{ game?.developer || "N/A" }} • {{ releaseYear || "N/A" }}
        </p>

        <!-- Badges -->
        <div class="flex gap-2 mt-2 flex-wrap">
          <Badge v-if="score" variant="success">{{ score }}</Badge>
          <Badge v-else variant="muted">N/A</Badge>
          <Badge v-if="game?.genres?.[0]" variant="muted">{{ game.genres[0] }}</Badge>
        </div>
      </div>
    </div>

    <!-- Actions (Install/Play) - Smart Component autonome -->
    <div class="p-5 bg-gradient-to-b from-white/2 to-transparent">
      <GameActions />
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-3 text-center border-y border-white/5 bg-white/2">
      <div class="p-3 border-r border-white/5 flex flex-col items-center">
        <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Temps</span>
        <span class="text-xs font-bold text-white">{{ formattedPlayTime }}</span>
      </div>
      <div class="p-3 border-r border-white/5 flex flex-col items-center">
        <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Dernier</span>
        <span class="text-xs font-bold text-white">{{ formattedLastPlayed }}</span>
      </div>
      <div class="p-3 flex flex-col items-center">
        <span class="text-[8px] font-black text-gray-600 uppercase mb-0.5">Statut</span>
        <span class="text-xs font-bold text-orange-400 italic">{{ completionStatus }}</span>
      </div>
    </div>

    <!-- Achievements -->
    <div v-if="achievementsProgress" class="p-6">
      <ProgressBar
        :value="achievementsProgress.unlocked"
        :max="achievementsProgress.total"
        label="Succès"
        variant="accent"
        value-format="fraction"
        show-value
      />
    </div>
  </Card>
</template>

<script setup lang="ts">
import { Card, Badge, ProgressBar } from "@/components/ui";
import { useCurrentGame } from "@/composables/useCurrentGame";
import GameActions from "./GameActions.vue";

/**
 * GameInfoCard - Smart Component autonome
 * Carte principale avec infos du jeu
 * Récupère toutes ses données via useCurrentGame (store-based)
 */

const {
  game,
  coverImage,
  releaseYear,
  score,
  formattedPlayTime,
  formattedLastPlayed,
  completionStatus,
  achievementsProgress,
} = useCurrentGame();
</script>
