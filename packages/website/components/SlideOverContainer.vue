<template>
  <div
    class="relative h-auto w-full overflow-hidden"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @touchend="onTouch"
  >
    <div class="h-full w-full">
      <slot name="content" :is-hovered="isHovered" />

      <div
        :class="{ 'translate-y-full': !isHovered }"
        class="absolute bottom-0 h-full w-full overflow-hidden transition-all duration-500"
      >
        <slot name="details" :is-hovered="isHovered" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isHovered = ref(false)

const onMouseEnter = () => {
  isHovered.value = true
}

const onMouseLeave = () => {
  isHovered.value = false
}

const onTouch = () => {
  isHovered.value = !isHovered.value
}
</script>
