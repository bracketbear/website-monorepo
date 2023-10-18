<template>
  <div class="grid grid-cols-1 gap-8 xl:grid-cols-2">
    <!-- Project Card -->
    <div
      v-for="(project, i) in projects"
      :key="i"
      class="flex flex-col gap-4 rounded-2xl border-2 border-solid border-black bg-primary-lightest p-8 hard-shadow-xl"
    >
      <!-- Title -->
      <h2 v-if="project.attributes?.title" class="mb-2 text-center text-2xl font-bold md:text-4xl">
        {{ project.attributes?.title }}
      </h2>
      <!-- Project Type -->
      <p v-if="project.attributes?.projectType" class="flex flex-col flex-wrap justify-center gap-x-1 text-center font-heading leading-5 sm:flex-row sm:leading-normal">
        <span>Project type: </span><span class="text-alt-1">{{ project.attributes?.projectType }}</span>
      </p>
      <!-- Skill Pills -->
      <div v-if="project.attributes?.technical_skills?.data.length > 0" class="flex flex-wrap justify-center gap-2">
        <UiPill
          v-for="(skill, i) in project.attributes?.technical_skills?.data"
          :key="i"
          :label="skill.attributes?.label"
          class="grow-0"
        />
      </div>
      <!-- Main Image -->
      <div v-if="hasMainImage(project)" class="flex items-center justify-center sm:h-64 xl:h-72">
        <CmsMedia :media="getMainImage(project)" class="h-full w-fit rounded border-2 border-solid border-black bg-secondary" />
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
import { ApiProjectProject } from '%/contentTypes'
import ArrowRightIcon from '~/assets/icons/arrow-right.svg'

// TODO: filter by featured in the future?
const collectionName: ApiProjectProject['collectionName'] = 'projects'
const result = await useAsyncData(
  collectionName,
  () => useStrapi().find<ApiProjectProject['attributes']>(collectionName, {
    populate: ['mainImage', 'technical_skills'],
    sort: 'order:asc',
  }),
)
const projects = result.data.value?.data ?? []

const hasMainImage = (project: ApiProjectProject) => {
  return !!project?.attributes?.mainImage?.data
}
const getMainImage = (project: ApiProjectProject) => {
  if (project?.attributes?.mainImage?.data) {
    return project?.attributes?.mainImage?.data
  } else {
    return false
  }
}
</script>
