<template>
  <TransitionRoot appear :show="isOpen" as="template">
    <Dialog as="div" @close="handleClose" class="relative z-50">
      <!-- Backdrop -->
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/85 backdrop-blur-lg" />
      </TransitionChild>

      <!-- Modal Panel -->
      <div class="fixed inset-0 overflow-y-auto">
        <div class="flex min-h-full items-center justify-center p-4 text-center">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-95"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-95"
          >
            <DialogPanel
              :class="[
                'w-full transform overflow-hidden rounded-2xl bg-remix-bg-content border border-white/10 p-8 text-left align-middle shadow-glow-strong transition-all',
                sizeClasses[size]
              ]"
            >
              <!-- Title with Glow Effect -->
              <div class="mb-6">
                <div class="relative inline-block">
                  <DialogTitle
                    as="h3"
                    class="relative z-10 text-3xl font-black italic tracking-tight text-white"
                  >
                    {{ title }}
                  </DialogTitle>
                  <div class="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[80%] bg-remix-accent blur-[50px] opacity-30 -z-10"></div>
                </div>
                
                <DialogDescription
                  v-if="description"
                  class="mt-2 text-sm text-white/50"
                >
                  {{ description }}
                </DialogDescription>
              </div>

              <!-- Content -->
              <div class="mb-6">
                <slot />
              </div>

              <!-- Footer Actions -->
              <div v-if="$slots.footer" class="flex justify-end gap-3">
                <slot name="footer" />
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  TransitionRoot,
  TransitionChild,
  Dialog,
  DialogPanel,
  DialogTitle,
  DialogDescription,
} from '@headlessui/vue'

/**
 * Modal/Dialog component using Headless UI Dialog
 * 
 * @example
 * <Modal v-model="showConfirm" title="Confirmer la suppression" :close-on-backdrop="true">
 *   <p>Êtes-vous sûr de vouloir désinstaller ce jeu ?</p>
 *   
 *   <template #footer>
 *     <Button variant="ghost" @click="showConfirm = false">Annuler</Button>
 *     <Button variant="danger" @click="confirmDelete">Supprimer</Button>
 *   </template>
 * </Modal>
 */

const props = withDefaults(
  defineProps<{
    /** Control modal visibility */
    modelValue: boolean
    /** Modal title */
    title: string
    /** Optional description below title */
    description?: string
    /** Allow closing by clicking backdrop */
    closeOnBackdrop?: boolean
    /** Modal size */
    size?: 'sm' | 'md' | 'lg' | 'xl'
  }>(),
  {
    closeOnBackdrop: true,
    size: 'md',
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const handleClose = () => {
  if (props.closeOnBackdrop) {
    isOpen.value = false
  }
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}
</script>
