<template>
  <div
    ref="containerRef"
    class="relative h-full w-full"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchEnd"
  >
    <canvas
      ref="canvasRef"
      class="absolute z-0 h-full w-full"
    />
    <div class="relative z-10 h-full w-full">
      <slot :setting-up="settingUp" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { FlateralusCanvas, Pointer, MousePointer } from 'flateralus' // Adjust the import path as necessary
import type { Sprite, FlateralusCanvasConfig } from 'flateralus'

const props = withDefaults(defineProps<{
  animationSprite: new(...args: any[]) => Sprite,
  resetOnResize?: boolean,
  config?: any,
  intersectionThreshold?: number,
}>(), {
  resetOnResize: true,
  config: {},
  intersectionThreshold: 0.05,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLCanvasElement | null>(null)
let flateralusCanvas: FlateralusCanvas
let pointer: Pointer
const flateralusCanvasConfig: FlateralusCanvasConfig = {
  animationSprite: null,
  animationSpriteConfig: {},
}

onMounted(() => {
  if (canvasRef.value) {
    flateralusCanvasConfig.animationSprite = props.animationSprite
    flateralusCanvasConfig.animationSpriteConfig = { ...props.config }

    flateralusCanvas = new FlateralusCanvas(canvasRef.value, flateralusCanvasConfig)
    flateralusCanvas.setupCanvas()
  } else {
    console.error('No canvas element found')
  }

  if (containerRef.value) {
    pointer = new MousePointer(containerRef.value)
    flateralusCanvas.registerPointer(pointer)
  }
})

onBeforeUnmount(() => {
  console.log('Cleaning up canvas')
  if (flateralusCanvas) {
    flateralusCanvas.cleanup()
  }
})

const settingUp = ref(false) // Update the logic to reflect the new setup
</script>
