<template>
  <NuxtLayout class="bg-primary">
    <!-- Hero -->
    <div class="h-[calc(100vh-4rem)] border-b-2 border-solid border-black bg-primary-dark bg-gradient-to-br from-black md:h-[calc(100vh-5rem)] ">
      <FlateralusCanvas
        v-if="isLoaded"
        :animation-class="FibonacciSpiral"
        :config="animationConfig"
        class="h-full w-full"
      />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { CircleSprite, repulsionBehavior, isWithinRadius, slowReturnBehavior, GeneratorGetSprite } from 'flateralus'
import { FibonacciSpiral, FibonacciSpiralAnimationConfig } from '~/animations/fib-spiral'

const animationConfig = ref<Partial<FibonacciSpiralAnimationConfig>>({})
const isLoaded = ref(false)

onMounted(() => {
  const getSprite: GeneratorGetSprite = (context) => {
    const sprite = new CircleSprite(context, 10)
    sprite.setScale(0.18)
    sprite.rotate(-30)

    sprite.addBehavior(repulsionBehavior)
      .when((sprite, ctx) => {
        return isWithinRadius(sprite.getGlobalPosition(), ctx.pointer.position, 100)
      })
    sprite.addBehavior(slowReturnBehavior)
      .when((sprite, ctx) => {
        return !isWithinRadius(sprite.getGlobalPosition(), ctx.pointer.position, 100)
      })

    return sprite
  }

  animationConfig.value = {
    getSprite,
  }

  isLoaded.value = true
})

useSeoMeta({
  title: 'Flateralus.js - A JavaScript library for creating "set-it-and-forget-it" interactive particle animations',
})
</script>
