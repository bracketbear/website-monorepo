<template>
  <div
    class="relative flex aspect-video h-auto w-full flex-col items-center overflow-hidden rounded-3xl border-4 border-black bg-[url('~/assets/images/ncbc-front.jpg')] bg-cover"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @touchend="onTouch"
  >
    <div :class="props.backgroundColor" class="flex h-full w-full flex-col items-center justify-center">
      <div :class="{ 'opacity-0': isHovered }" class="font-heading flex flex-col items-center justify-end transition-opacity">
        <p class="text-lg font-bold">
          {{ props.company }}
        </p>
        <p class="text-sm">
          {{ props.position }}
        </p>
        <p class="text-sm">
          {{ `${props.startDate} - ${props.endDate}` }}
        </p>
      </div>
      <div
        :class="{ 'translate-y-full': !isHovered }"
        class="absolute bottom-0 h-full w-full overflow-hidden bg-black/90 transition-all duration-500"
      >
        <div class="flex h-full flex-col items-center justify-center">
          <p class="text-sm">
            {{ props.details }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

interface Props {
  company: string,
  position: string,
  startDate: string,
  endDate: string,
  backgroundImageSrc: string,
  backgroundColor: string,
  details: string,
}

const props = withDefaults(defineProps<Props>(), ({
  company: 'Company Name',
  position: 'Position',
  startDate: 'Start Date',
  endDate: 'End Date',
  backgroundImageSrc: '',
  backgroundColor: 'bg-red-400',
  details: 'Job details',
}))

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
