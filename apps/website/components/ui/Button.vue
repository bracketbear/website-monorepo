<template>
  <button
    :class="[ sizeClasses[props.size], colorClasses[props.color], disabledClass, roundedClass ]"
    class="flex items-center justify-center gap-1
           border-2 border-solid border-black font-heading
           shadow-black transition-all hard-shadow
           hover:scale-105 hover:shadow-[0.4rem_0.4rem_0] hover:shadow-black
           active:scale-100 active:shadow-[1px_1px_0] active:shadow-black"
    :disabled="props.disabled"
    :aria-label="ariaLabel"
    @click="handleClick"
  >
    <slot />
    <!-- Icon -->
    <div v-if="hasIcon" class="flex h-[1em] w-[1em] items-center justify-center [&_svg]:h-full [&_svg]:w-full">
      <slot name="icon" />
    </div>
  </button>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

interface Props {
  size?: 'small' | 'default' | 'large';
  color?: 'primary' | 'secondary' | 'white' | 'red';
  disabled?: boolean;
  round?: boolean;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  color: 'primary',
  disabled: false,
  round: false,
  ariaLabel: '',
})
const slots = useSlots()
const emit = defineEmits<{(event: 'click'): void}>()

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}

const sizeClasses = {
  small: 'px-2 py-[0.53rem] text-sm',
  default: 'px-2 py-[0.53rem] text-sm sm:px-3 sm:py-2 sm:text-md',
  large: 'px-3 py-2 text-md sm:px-4 sm:py-2 sm:text-lg',
}

const colorClasses = {
  primary: 'bg-primary text-black hover:bg-primary-dark active:bg-primary-darker',
  secondary: 'bg-secondary text-black hover:bg-secondary-dark active:bg-secondary-darker',
  white: 'bg-white text-black hover:bg-gray-100 active:bg-gray-200',
  red: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700',
}

const roundedClass = computed(() => (props.round ? 'rounded-full aspect-square' : 'rounded'))
// TODO: CSSify this
const disabledClass = computed(() => (props.disabled ? 'opacity-50 cursor-not-allowed' : ''))
const hasIcon = computed(() => !!slots.icon)
</script>
