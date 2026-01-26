<template>
    <div class="space-y-2">
        <!-- Install Button -->
        <Button v-if="!installed && !downloading" variant="primary" size="lg" class="w-full" @click="$emit('install')">
            <template #icon>
                <span class="text-lg">↓</span>
            </template>
            Installer
        </Button>

        <!-- Download Progress -->
        <div v-if="downloading" class="space-y-3">
            <ProgressBar :value="downloadProgress ?? 0" label="Téléchargement..." variant="gradient" :glow="true"
                bordered show-value>
                <template #subtitle>
                    <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                        {{ downloadSpeed }}
                    </span>
                    <span class="text-[8px] font-bold text-gray-500 uppercase tracking-tighter">
                        {{ downloadedSize }} / {{ totalSize }}
                    </span>
                </template>
            </ProgressBar>
        </div>

        <!-- Play Button -->
        <Button v-if="installed && !launching" variant="success" size="lg" class="w-full" @click="$emit('play')">
            <template #icon>
                <span class="text-lg">▶</span>
            </template>
            Lancer le jeu
        </Button>

        <!-- Force Close Button -->
        <Button v-if="launching" variant="danger" size="lg" class="w-full" @click="$emit('force-close')">
            <template #icon>
                <span class="text-lg">■</span>
            </template>
            Forcer la fermeture
        </Button>
    </div>
</template>

<script setup lang="ts">
import { Button, ProgressBar } from '@/components/ui'

/**
 * GameActions - Boutons d'action du jeu (Install/Play/Stop)
 * Avec gestion du téléchargement en cours
 */

defineProps<{
    installed: boolean
    downloading: boolean
    launching: boolean
    downloadProgress?: number
    downloadSpeed?: string
    downloadedSize?: string
    totalSize?: string
}>()

defineEmits<{
    install: []
    play: []
    'force-close': []
}>()
</script>
