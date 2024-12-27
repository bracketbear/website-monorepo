<template>
  <UiButton
    color="red"
    round
    @click="emit('click')"
  >
    <template #icon>
      <XIcon />
    </template>
  </UiButton>
</template>

<script setup lang="ts">
import XIcon from '~/assets/icons/x.svg'

const emit = defineEmits<{(event: 'click'): void}>()
</script>
