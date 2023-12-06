<template>
  <div class="wave-divider">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-full" viewBox="0 0 1440 320">
      <path :fill="props.bottomColor" fill-opacity="1" d="M0,192L48,186.7C96,181,192,171,288,165.3C384,160,480,160,576,165.3C672,171,768,181,864,186.7C960,192,1056,192,1152,186.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
    </svg>
  </div>
</template>

<script setup lang="ts">
interface Props {
  bottomColor: string
}

const props = withDefaults(defineProps<Props>(), {
  bottomColor: '#0000ff',
})
</script>
