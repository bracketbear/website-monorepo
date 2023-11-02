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
    <canvas ref="canvas" class="absolute z-0 h-full w-full" />
    <div class="relative z-10 h-full w-full">
      <slot :setting-up="settingUp" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Pointer, BaseSprite } from 'flateralus'
import debounce from '~/utils/helpers/debounce'

// Define component props with default values
const props = withDefaults(defineProps<{
  animationClass: new(...args: any[]) => BaseSprite,
  resetOnResize?: boolean,
  config?: any,
  intersectionThreshold?: number,
}>(), {
  resetOnResize: true,
  config: {},
  intersectionThreshold: 0.05,
})

// Define reactive variables
const settingUp = ref(false)
const resolution = ref([0, 0])
const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const pointer: Pointer = {
  position: {
    x: -1000,
    y: -1000,
  },
  active: false,
}

// Define non-reactive variables
let animationFrameId: number = 0
let animationInstance: BaseSprite | null = null
let intersectionObserver: IntersectionObserver | null = null
let resizeObserver: ResizeObserver | null = null
let render: (timestamp: number) => void = () => {}

// Define the resizeCanvas function
const resizeCanvas = debounce(() => {
  if (!canvas.value) { return }

  settingUp.value = true

  const ctx = canvas.value.getContext('2d')
  if (!ctx) { return }

  // eslint-disable-next-line new-cap
  animationInstance = new props.animationClass(ctx, props.config)

  const dpr = window.devicePixelRatio
  const rect = canvas.value.getBoundingClientRect()

  // Set the "actual" size of the canvas
  canvas.value.width = rect.width * dpr
  canvas.value.height = rect.height * dpr

  // Scale the context to ensure correct drawing operations
  ctx.scale(dpr, dpr)

  if (props.resetOnResize) {
    cancelAnimationFrame(animationFrameId)
    animationInstance.reset()
  }

  if (settingUp.value) {
    animationInstance.setup()
  }

  resolution.value = [rect.width, rect.height]
  console.log('canvas resized', resolution.value)
  settingUp.value = false

  setIntersectionObserver()
  setResizeObserver()
}, 200) // 200ms debounce time

onMounted(() => {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) { return }

  // Define the render function
  render = (timestamp: number) => {
    if (!animationInstance) { return }

    ctx.clearRect(0, 0, canvas.value!.width, canvas.value!.height)
    animationInstance.draw({ timestamp, pointer })
    animationFrameId = requestAnimationFrame(render)
  }

  resizeCanvas()
  render(performance.now())
})

onUnmounted(() => {
  cancelAnimationFrame(animationFrameId)

  // Disconnect the Intersection Observer
  if (intersectionObserver) {
    intersectionObserver.disconnect()
    intersectionObserver = null
  }

  // Disconnect the Resize Observer
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// Watch for changes in props.config
watch(() => props.config, () => {
  if (animationInstance) {
    animationInstance.reset()
  }

  animationInstance = new props.animationClass(canvas.value!.getContext('2d')!, props.config)
  animationInstance.setup()

  render(performance.now())
})

// Define event handlers
const resetPointer = () => {
  pointer.position.x = -1000
  pointer.position.y = -1000
  pointer.active = false
}

const handleMouseMove = (event: MouseEvent) => {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) { return }

  pointer.position.x = event.clientX - rect.left
  pointer.position.y = event.clientY - rect.top
}

const handleMouseDown = () => {
  pointer.active = true
}

const handleMouseUp = () => {
  pointer.active = false
}

const handleMouseLeave = () => {
  resetPointer()
}

const handleTouchMove = (event: TouchEvent) => {
  const rect = canvas.value?.getBoundingClientRect()
  if (!rect) { return }

  pointer.position.x = event.touches[0].clientX - rect.left
  pointer.position.y = event.touches[0].clientY - rect.top
  pointer.active = true
}

const handleTouchEnd = () => {
  resetPointer()
}

// Define observer setup functions
const setIntersectionObserver = () => {
  intersectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        render(performance.now())
      } else {
        cancelAnimationFrame(animationFrameId)
      }
    })
  }, {
    threshold: props.intersectionThreshold,
  })

  // Start observing the canvas
  if (canvas.value) {
    intersectionObserver.observe(canvas.value)
  }
}

const setResizeObserver = () => {
  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.target === canvas.value &&
          !settingUp.value &&
          (Math.abs(entry.contentRect.width - resolution.value[0]) > 0.5 ||
          Math.abs(entry.contentRect.height - resolution.value[1]) > 0.5)
      ) {
        resizeCanvas()
      }
    })
  })

  // Start observing the canvas
  if (canvas.value) {
    resizeObserver.observe(canvas.value)
  }
}

</script>
