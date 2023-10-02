<template>
  <Teleport to="body">
    <div v-if="props.isOpen" class="fixed inset-0 z-50 flex items-center justify-center">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black/80" @click="closeModal" />

      <!-- Modal Container -->
      <div :class="[props.fixedSize ? 'w-4/5' : 'h-auto w-auto', 'z-50 mx-auto max-w-[91%] overflow-y-auto rounded bg-white shadow-lg md:max-w-xl']">
        <!-- Modal Header -->
        <div class="px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold">
              {{ props.title }}
            </h2>
            <button class="close-modal text-black" @click="closeModal">
              <XIcon class="h-6 w-6" />
            </button>
          </div>
        </div>

        <!-- Modal Content -->
        <div class="px-6 py-2 text-left">
          <!-- Content Goes Here -->
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import XIcon from '@/assets/icons/x.svg'

interface Props {
  isOpen: boolean
  title: string
  fixedSize: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  title: '',
  fixedSize: true,
})

const emit = defineEmits(['update:isOpen'])

const closeModal = () => {
  emit('update:isOpen', false)
}
</script>
