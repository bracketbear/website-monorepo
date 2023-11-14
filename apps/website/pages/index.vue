<template>
  <NuxtLayout class="bg-primary">
    <!-- Hero -->
    <div class="h-[calc(100vh-4rem)] border-b-2 border-solid border-black bg-primary-dark bg-gradient-to-br from-black md:h-[calc(100vh-5rem)] ">
      <FlateralusCanvas
        v-if="isLoaded"
        :animation-sprite="ParticleGridSprite"
        :config="animationConfig"
        class="h-full w-full"
      >
        <div class="flex h-full items-center">
          <div class="container flex flex-col items-center justify-center gap-3 text-center font-heading text-xl text-white md:px-16">
            <div class="text-hard-shadow">
              Hi! My name is
            </div>
            <div class="text-5xl text-white shadow-white text-stroke text-hard-shadow sm:text-7xl md:text-8xl">
              Harrison
            </div>
            <div class="text-hard-shadow">
              I'm a full-stack developer with a background in design, immersive Experiences, and Generative A.I.
            </div>
            <div class="mt-4 flex w-full flex-col justify-center gap-4 md:flex-row">
              <NuxtLink to="#welcome">
                <UiButton size="large" color="white" class="w-full md:w-auto">
                  Learn More
                </UiButton>
              </NuxtLink>
              <NuxtLink to="#contact">
                <UiButton size="large" class="w-full md:w-auto">
                  Let's Chat!
                </UiButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </FlateralusCanvas>
    </div>
    <!-- Loop through page sections. -->
    <section
      v-for="section in sections"
      :key="section.name"
      class="min-h-screen py-[50vh]"
    >
      <div :id="section.name" class="flex min-h-screen flex-col justify-center">
        <div class="mx-auto flex flex-col items-center justify-center gap-8 p-4 text-center font-heading text-2xl text-black">
          <p v-for="(text, i) in section.text" :key="i">
            {{ text }}
          </p>
        </div>
        <div v-if="section.component" :class="section.componentClass" class="p-4">
          <Component :is="section.component" />
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CustomPath, repulsionBehavior, SvgHelper, isWithinRadius, slowReturnBehavior } from 'flateralus'
import type { GeneratorGetSprite } from 'flateralus'
import { ParticleGridConfig, ParticleGridSprite } from '~/animations/particle-grid'
import WorkHistory from '~/components/WorkHistory/WorkHistory.vue'
import ContactForm from '~/components/ContactForm.vue'
import SkillList from '~/components/SkillList.vue'
import ProjectList from '~/components/ProjectList.vue'
import BracketBearLogo from '~/assets/icons/bracket-bear-logo.svg?raw'

const animationConfig = ref<Partial<ParticleGridConfig>>({})
const isLoaded = ref(false)

onMounted(() => {
  const paths = SvgHelper.extractPaths(BracketBearLogo)
  const boundingBox = SvgHelper.computeBoundingBox(paths)

  const getSprite: GeneratorGetSprite | undefined = paths
    ? (context) => {
        const sprite = new CustomPath(context, paths)
        sprite.width = boundingBox.width
        sprite.height = boundingBox.height
        sprite.setScale(0.18)
        sprite.rotate(-30)

        sprite.addBehavior(repulsionBehavior)
          .when((sprite, ctx) => {
            return isWithinRadius(sprite.getPosition(), ctx.pointer.position, 100)
          })
        sprite.addBehavior(slowReturnBehavior)
          .when((sprite, ctx) => {
            return !isWithinRadius(sprite.getPosition(), ctx.pointer.position, 100)
          })

        return sprite
      }
    : undefined

  animationConfig.value = {
    getSprite,
    fillContainer: true,
  }

  isLoaded.value = true
})

interface PageSection {
  name: string,
  text: string[],
  component?: Component,
  componentClass?: string,
}

const sections: PageSection[] = [
  {
    name: 'welcome',
    text: [
      'Welcome to Bracket Bear',
      'This is my portfolio - my space on the web.',
      "I'm glad you're here.",
    ],
  },
  {
    name: 'work-history',
    text: [
      "Name an industry and there's a good chance that I've worked in it.",
      "From brews to boxes to mind blowing immersive experiences, I've been lucky to experience a ton of different things. Heck, I even worked in a toxicology lab!",
      "Here's a brief timeline of my work history.",
    ],
    component: WorkHistory,
    componentClass: 'max-w-2xl w-full mx-auto',
  },
  {
    name: 'technical-skills',
    text: [
      "Throughout my career, I've had to adapt and grow. As a result, my digital toolbox has grown as well.",
      "Here are some of the tools I've used over the years.",
    ],
    component: SkillList,
  },
  {
    name: 'projects',
    text: [
      "I've gotten to work on some cool projects over the years.",
      'Here are a handful of them.',
    ],
    component: ProjectList,
  },
  {
    name: 'contact',
    text: [
      "Alrighty, I've said enough. Now I'd love to hear from you.",
      "Feel free to fill out the form below and I'll get back to you as soon as possible.",
    ],
    component: ContactForm,
    componentClass: 'container max-w-4xl',
  },
]

useSeoMeta({
  title: 'Home',
})
</script>
