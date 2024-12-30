<template>
  <div :class="navClass" class="h-16 border-y-2 border-solid border-black md:h-20">
    <nav class="container relative mx-auto flex  h-full items-center justify-between">
      <!-- Branding -->
      <NuxtLink :to="{ name: 'index' }" class="flex items-center gap-4">
        <BBLogo class="h-8 text-black md:h-10" />
      </NuxtLink>
      <!-- Menu Button -->
      <UiButton color="secondary" class="lg:hidden" @click="toggleMenu">
        <Bars3Icon class="size-6 stroke-black stroke-1" />
      </UiButton>
      <!-- Menu (Navigation) Items -->
      <ul
        :class="{ 'max-lg:translate-x-full': !menuOpen }"
        class="fixed right-0 top-0
              z-50 flex size-full flex-col gap-10 bg-primary-lightest p-8
              transition-transform duration-300 ease-in-out lg:static
              lg:size-auto lg:flex-row lg:items-center lg:bg-transparent lg:p-0"
      >
        <CloseButton
          class="absolute right-4 top-4 lg:hidden"
          @click="closeMenu"
        />
        <li v-for="(link, index) in links" :key="index">
          <NuxtLink
            :key="index"
            :to="link.to"
            :title="link.alt"
          >
            <p
              v-if="!link.emphasized"
              class="inline-block font-heading
                     text-xl font-semibold tracking-wide text-gray-900
                     hover:text-gray-700 hover:underline hover:underline-offset-4"
            >
              {{ link.label }}
            </p>
            <UiButton
              v-else
              :to="link.to"
              :title="link.alt"
              class="w-full"
              size="large"
              color="secondary"
              @click="closeMenu"
            >
              {{ link.label }}
            </UiButton>
            <!-- Description - Mobile only -->
            <div v-if="!link.emphasized" class="text-xs text-gray-500 lg:hidden">
              {{ link.alt }}
            </div>
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Bars3Icon } from '@heroicons/vue/24/solid'
import BBLogo from '~/assets/svg/logo.svg?component'
import { links } from '~/config/navigation'

const props = withDefaults(defineProps<{
    transparent?: boolean
  }>(), {
  transparent: false,
})

const navClass = computed(() => {
  return props.transparent ? 'bg-transparent' : 'bg-primary'
})

// store state of menu
const menuOpen = ref(false)

// function to toggle menu
const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

// TODO: Remove this if we don't use it.
// const appName = useRuntimeConfig().public.appName
</script>
