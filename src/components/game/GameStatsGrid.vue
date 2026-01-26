<template>
    <div class="grid grid-cols-4 gap-4">
        <StatCard label="Taille" :value="installSize" color="cyan" />
        <StatCard label="Durée" :value="duration" color="pink" />
        <StatCard label="Note" :color="scoreColor">
            {{ scoreDisplay }}
        </StatCard>
        <StatCard label="ProtonDB" :color="protonColor">
            {{ protonTier }}
        </StatCard>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { StatCard } from '@/components/ui'

/**
 * GameStatsGrid - Grille de stats du jeu
 * Affiche: taille, durée HLTB, note, ProtonDB
 */

const props = defineProps<{
    installSize?: string
    duration?: string
    score?: number
    protonTier?: string
}>()

const scoreDisplay = computed(() => props.score ? `${props.score}/100` : '--')

const scoreColor = computed(() => {
    if (!props.score) return 'gray'
    if (props.score >= 75) return 'green'
    if (props.score >= 50) return 'yellow'
    return 'red'
})

const protonColor = computed(() => {
    const colors: Record<string, 'cyan' | 'yellow' | 'gray' | 'red' | 'green'> = {
        native: 'cyan',
        platinum: 'cyan',
        gold: 'yellow',
        silver: 'gray',
        bronze: 'yellow',
        pending: 'gray',
        borked: 'red',
    }
    return colors[props.protonTier || ''] || 'gray'
})
</script>
