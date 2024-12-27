<template>
  <footer class="flex flex-col gap-8 bg-black py-12">
    <!-- Copyright Text -->
    <p class="font-heading text-center text-gray-100">
      &copy;{{ formattedYear }} Harrison Callahan. All Rights Reserved.
    </p>
    <!-- Links -->
    <div class="container grid gap-4 sm:grid-cols-2">
      <nav>
        <div class="font-heading text-primary text-lg">
          Website Navigation
        </div>
        <ul class="flex flex-col">
          <li v-for="(link, index) in links" :key="index">
            <NuxtLink
              :key="index"
              :to="link.to"
              :title="link.alt"
              class="inline-block w-max"
            >
              <div
                class="font-heading inline-block
                       text-sm font-semibold tracking-wider text-white underline-offset-4
                       hover:text-orange-800 hover:underline"
              >
                {{ link.label }}
              </div>
            </NuxtLink>
          </li>
        </ul>
      </nav>
      <!-- Social & External Links -->
      <div>
        <div class="font-heading text-primary text-lg">
          Find Me On The Web
        </div>
        <ul class="flex flex-col">
          <li v-for="(link, index) in socialLinks" :key="index">
            <NuxtLink
              :key="index"
              :to="link.to"
              :title="link.alt"
              class="inline-block w-max"
            >
              <div
                class="font-heading inline-block
                       text-sm font-semibold tracking-wider text-white underline underline-offset-4
                       hover:text-orange-800"
              >
                {{ link.label }}
              </div>
            </NuxtLink>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { links, socialLinks } from '~/config/navigation'

const year = new Date().getFullYear()

const formattedYear = computed(() => {
  if (year === 2023) {
    return year
  } else {
    return `2023-${year}`
  }
})
</script>
