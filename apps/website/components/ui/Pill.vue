<template>
  <div
    class="rounded-full border-2 border-solid border-secondary-dark px-2 py-1 text-center font-heading text-[0.625rem] transition-all md:px-3 md:py-2 md:text-xs"
    :class="{
      'scale-110 !bg-secondary-dark text-white': props.isActive,
      'bg-secondary': !props.isActive
    }"
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
