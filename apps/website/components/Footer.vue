<template>
  <footer class="container flex flex-col justify-center gap-8 bg-black py-8">
    <!-- Copyright Text -->
    <p class="text-center font-heading text-gray-100">
      &copy;{{ formattedYear }} Harrison Callahan. All Rights Reserved.
    </p>
    <!-- Links -->
    <div class="flex flex-col gap-x-16 gap-y-8 sm:mx-auto sm:grid sm:w-max sm:grid-cols-[repeat(2,1fr)]">
      <!-- Website Navitagtion -->
      <nav>
        <div class="font-heading text-lg text-primary">
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
                class="inline-block font-heading
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
        <div class="font-heading text-lg text-primary">
          Find Me On The Web
        </div>
        <ul class="flex flex-col">
          <li v-for="(link, index) in socialLinks" :key="index">
            <NuxtLink
              :key="index"
              :to="link.to"
              :title="link.alt"
              target="_new"
              class="inline-block w-max"
            >
              <div
                class="inline-block font-heading
                       text-sm font-semibold tracking-wider text-white
                       hover:text-secondary hover:underline"
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
