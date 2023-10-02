<template>
  <div
    :class="{
      'flex flex-col': props.labelPosition === 'top',
      'flex flex-row items-center': props.labelPosition === 'side'
    }"
  >
    <label v-if="props.label" :for="inputId" class="font-heading mr-2 tracking-wide text-black">
      {{ props.label }}{{ required && ' *' }}
    </label>
    <slot />
    <div v-if="props.error" class="text-sm text-red-500">
      {{ props.error }}
    </div>
  </div>
</template>

<script lang="ts" setup>
import { generateUniqueId } from '~/utils/helpers/id'

interface Props {
  label?: string;
  labelPosition?: 'top' | 'side';
  required?: boolean;
  error?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  labelPosition: 'top',
  required: false,
  error: '',
})

// Generate a unique ID for this instance of the component
const inputId = generateUniqueId('input-')
</script>
