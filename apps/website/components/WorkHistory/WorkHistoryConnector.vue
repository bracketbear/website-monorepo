<template>
  <div class="flex flex-col items-center gap-3">
    <div
      v-for="index in 3"
      :key="index"
      class="pulse h-4 w-4 rounded-full border-2 border-solid border-black bg-black"
      :style="{ animationDelay: `${index * .25}s` }"
    />
  </div>
</template>

<style scoped>
@keyframes pulse {
  0% {
    transform: scale(1);
  }
  33.33% {
    transform: scale(1.5);
  }
  66.66% {
    transform: scale(1);
  }
}

.pulse {
  animation: pulse 2s infinite;
}
</style>
