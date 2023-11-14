<template>
  <div
    ref="container"
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
import { FlateralusCanvas } from 'flateralus' // Adjust the import path as necessary
import type { BaseSprite, FlateralusCanvasConfig } from 'flateralus'

const props = withDefaults(defineProps<{
  animationSprite: new(...args: any[]) => BaseSprite,
  resetOnResize?: boolean,
  config?: any,
  intersectionThreshold?: number,
}>(), {
  resetOnResize: true,
  config: {},
  intersectionThreshold: 0.05,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let flateralusCanvas: FlateralusCanvas
const flateralusCanvasConfig: FlateralusCanvasConfig = {
  animationSprite: null,
  animationSpriteConfig: {},
}

onMounted(() => {
  if (canvasRef.value) {
    flateralusCanvasConfig.animationSprite = props.animationSprite
    flateralusCanvasConfig.animationSpriteConfig = { ...props.config }
    console.log('Setting up canvas', flateralusCanvasConfig)

    flateralusCanvas = new FlateralusCanvas(canvasRef.value, flateralusCanvasConfig)
    flateralusCanvas.setupCanvas()
  } else {
    console.error('No canvas element found')
  }
})

onBeforeUnmount(() => {
  console.log('Cleaning up canvas')
  if (flateralusCanvas) {
    flateralusCanvas.cleanup()
  }
})

const settingUp = ref(false) // Update the logic to reflect the new setup

// Event handling methods that call the corresponding methods in FlateralusCanvas
// const handleClick = (event: MouseEvent) => {
//   console.log('Click event', event)
// }

// const handleMouseMove = () => {
//   console.log('moving')
// }
const handleMouseMove = (event: MouseEvent) => flateralusCanvas.handlePointerMove(event)
const handleMouseDown = (event: MouseEvent) => flateralusCanvas.handlePointerDown(event)
const handleMouseUp = (event: MouseEvent) => flateralusCanvas.handlePointerUp(event)
const handleMouseLeave = (event: MouseEvent) => flateralusCanvas.handlePointerLeave(event)
const handleTouchMove = (event: TouchEvent) => flateralusCanvas.handlePointerMove(event)
const handleTouchStart = (event: TouchEvent) => flateralusCanvas.handlePointerDown(event)
const handleTouchEnd = (event: TouchEvent) => flateralusCanvas.handlePointerUp(event)
</script>
