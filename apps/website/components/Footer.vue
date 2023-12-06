<template>
  <footer class="">
    <WaveDivider bottom-color="#262626" class=" -mb-1 border-0" />
    <div class="flex flex-col gap-16 bg-black">
      <!-- Contact Form -->
      <section id="reach-out" class="container flex flex-col gap-8">
        <div class="text-center font-heading text-white">
          <p class="mb-4 text-4xl">
            Reach Out!
          </p>
          <p class="text-xl">
            Feel free to fill out the form below and I'll get back to you as soon as possible.
          </p>
        </div>
        <ContactForm class="rounded-xl bg-gray-200 p-4" />
      </section>
      <!-- Footer -->
      <div class="container flex flex-col justify-center gap-8 py-16">
        <!-- Copyright Text -->
        <p class="text-center font-heading text-gray-100">
          &copy;{{ formattedYear }} Harrison Callahan. All Rights Reserved.
        </p>
        <!-- Links -->
        <div class="flex flex-col gap-x-16 gap-y-8 sm:mx-auto sm:grid sm:w-max sm:grid-cols-[repeat(2,1fr)]">
          <!-- Website Navitagtion -->
          <template v-for="section in navSections" :key="section.label">
            <component :is="section.container">
              <div class="font-heading text-primary">
                {{ section.label }}
              </div>
              <ul class="flex flex-col">
                <li v-for="(link, index) in section.links" :key="index">
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
            </component>
          </template>
        </div>
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

const navSections = [
  {
    label: 'Website Navigation',
    links,
    container: 'nav',
  },
  {
    label: 'Find Me On The Web',
    links: socialLinks,
    container: 'div',
  },
]
</script>
