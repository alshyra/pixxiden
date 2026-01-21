<template>
  <button 
    class="flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all"
    :class="active ? 'text-white' : 'text-white/50 hover:text-white/80'"
  >
    <!-- Icon -->
    <span class="text-xl">
      <svg v-if="icon === 'games'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M13 6H7V4c0-1.1.9-2 2-2h2c1.1 0 2 .9 2 2v2zm-3 2c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2s2-.9 2-2v-6c0-1.1-.9-2-2-2z"/>
        <path d="M4 8h4v8H4a2 2 0 01-2-2v-4a2 2 0 012-2zm12 0h-4v8h4a2 2 0 002-2v-4a2 2 0 00-2-2z"/>
      </svg>
      <svg v-else-if="icon === 'controller'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm7 0a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM3 8a1 1 0 011-1h12a1 1 0 011 1v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm3 2a1 1 0 10-2 0v2a1 1 0 102 0v-2zm2 1a1 1 0 100 2h4a1 1 0 100-2H8zm7-1a1 1 0 10-2 0v2a1 1 0 102 0v-2z"/>
      </svg>
      <svg v-else-if="icon === 'download'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
      <svg v-else-if="icon === 'clock'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
      </svg>
      <svg v-else-if="icon === 'calendar'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/>
      </svg>
      <svg v-else-if="icon === 'history'" class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
      </svg>
    </span>
    
    <!-- Label -->
    <span class="text-xs font-medium tracking-wide">{{ label }}</span>
    
    <!-- Active indicator -->
    <div 
      class="h-0.5 w-8 rounded-full transition-all"
      :class="active ? 'bg-white' : 'bg-transparent'"
    />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  icon: string
  label: string
  active?: boolean
}>()
</script>
