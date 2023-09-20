<template>
  <div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
    <!-- Project Card -->
    <div
      v-for="(project, i) in projects.data"
      :key="i"
      class="flex flex-col gap-4 rounded-2xl border-2 border-solid border-black bg-primary-lightest p-8 hard-shadow-xl"
    >
      <!-- Title -->
      <h2 class="mb-2 text-center text-xl font-bold">
        {{ project.attributes.title }}
      </h2>
      <!-- Project Type -->
      <div v-if="project.attributes.projectType" class="flex flex-wrap justify-center gap-2">
        <p class="font-heading">
          Project type: <span class="text-alt-1">{{ project.attributes.projectType }}</span>
        </p>
      </div>
      <!-- Skill Pills -->
      <div v-if="project.attributes.technical_skills?.data.length > 0" class="flex flex-wrap justify-center gap-2">
        <UiPill v-for="(skill, i) in project.attributes.technical_skills?.data" :key="i" :label="skill.attributes.label" />
      </div>
      <!-- Main Image -->
      <div v-if="hasMainImage(project)" class="max-h-96 overflow-hidden rounded border-2 border-solid border-black bg-secondary">
        <NuxtImg :src="getMainImageRoute(project)" />
      </div>
      <!-- Learn More button -->
      <div class="flex justify-center">
        <NuxtLink :to="`/projects/${project.id}`">
          <UiButton class="w-full md:w-auto">
            Learn More
            <template #icon>
              <ArrowRightIcon class="pt-0.5 transition-all" />
            </template>
          </UiButton>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ArrowRightIcon from '~/assets/icons/arrow-right.svg'

import { Project } from '~/config/projects'

// TODO: filter by featured in the future?

const projects = await useStrapi<Project>().find('projects', {
  populate: ['mainImage', 'technical_skills'],
})

const hasMainImage = (project) => {
  return !!project?.attributes.mainImage?.data
}
const getMainImageRoute = (project) => {
  if (project?.attributes.mainImage?.data?.attributes?.url) {
    return useStrapiMedia(project?.attributes.mainImage?.data?.attributes?.url)
  } else {
    return ''
  }
}
</script>
