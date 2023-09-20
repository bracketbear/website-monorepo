<template>
  <div
    class="font-heading border-secondary-dark max-w-sm rounded-full border-2 border-solid px-3 py-2 text-center text-xs transition-all"
    :class="{'!bg-secondary-dark scale-110 text-white': props.isActive, 'bg-secondary': !props.isActive}"
  >
    {{ props.label }}
  </div>
</template>

<script lang="ts" setup>
interface Props {
  label: string;
  isActive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  isActive: false,
})
</script>
