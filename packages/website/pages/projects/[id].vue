<template>
  <NuxtLayout class="bg-primary-lightest">
    <div
      v-if="project"
      class="container relative flex min-h-screen flex-col gap-8 overflow-hidden py-8"
    >
      <Meta :title="project.attributes.title" />
      <!-- Title -->
      <h1 v-if="project.attributes.title" class="text-2xl font-bold sm:text-4xl lg:text-6xl">
        {{ project.attributes.title }}
      </h1>
      <!-- Main Image -->
      <div v-if="mainImage" class="overflow-hidden rounded-3xl border-2 border-solid border-black bg-secondary hard-shadow-xl">
        <NuxtImg :src="mainImageRoute" />
      </div>
      <!-- Project Details and Description, Challenges, and Results -->
      <div class="grid gap-6 lg:grid-cols-3">
        <!-- Project Details -->
        <div class="lg:order-2">
          <div class=" flex h-auto flex-col gap-1 rounded border-2 border-solid border-black bg-white px-4 py-2 text-sm hard-shadow-xl">
            <template v-for="(detail, index) in projectDetails" :key="index">
              <template v-if="detail.value">
                <div class="grid grid-cols-2">
                  <p class="font-heading">
                    {{ detail.label }}:
                  </p>
                  <div v-if="Array.isArray(detail.value)" class="col-span-2 flex flex-wrap gap-x-3 gap-y-2 py-2">
                    <UiPill
                      v-for="(skill, i) in detail.value"
                      :key="i"
                      :label="skill.attributes.label"
                      class="w-max"
                    />
                  </div>
                  <p v-else class="font-medium">
                    {{ detail.value }}
                  </p>
                </div>
              </template>
            </template>
          </div>
        </div>
        <!-- Description, Challenges, and Results -->
        <div class="flex flex-col gap-4 lg:order-1 lg:col-span-2">
          <div v-for="(section, index) in longTextSections" :key="index">
            <p class="font-heading">
              {{ section.label }}:
            </p>
            <p class="font-medium">
              {{ section.value }}
            </p>
          </div>
        </div>
      </div>
      <!-- Blog Post Link -->
      <a
        v-if="project.attributes.blogPostLink"
        :href="project.attributes.blogPostLink"
        target="_blank"
        class="text-blue-500 underline"
      >Read More</a>
      <!-- Media Slider -->
      <div v-if="media">
        <p class="font-heading">
          Media:
        </p>
        <div class="scroll my-4 flex gap-4 overflow-scroll rounded-lg bg-black p-4">
          <button
            v-for="(mediaItem, index) in media"
            :key="index"
            class="inline-block shrink-0"
            @click="handleClick(mediaItem)"
          >
            <NuxtImg :src="mediaRoutes[index]" class="h-48 rounded border-2 border-solid border-white bg-secondary" />
          </button>
        </div>
      </div>
      <!-- Media Modal -->
      <UiModal :show-modal="modal.isVisible" class="bg-black" @update:show-modal="modal.isVisible = $event">
        <NuxtImg :src="modal.image" />
        <p>{{ modal.description }}</p>
      </UiModal>
    </div>
    <div v-else>
      <p>Project not found. Dang!</p>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { Project } from '~/config/projects'

const modal = reactive({
  image: '',
  description: '',
  isVisible: false,
})

const route = useRoute()
const projectId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
const result = await useStrapi().findOne<Project>('projects', projectId, {
  populate: ['mainImage', 'media', 'technical_skills'],
})
const project = result.data
const mainImage = project?.attributes.mainImage?.data ?? {}
const media = project?.attributes.media?.data ?? []
const mainImageRoute = mainImage?.attributes.url ? useStrapiMedia(mainImage?.attributes.url) : ''
const mediaRoutes = media.map(mediaItem => mediaItem?.attributes.url ? useStrapiMedia(mediaItem?.attributes.url) : '')

interface LabelValue {
  label: string;
  value: string;
}

const projectDetails: LabelValue[] = [
  {
    label: 'Role',
    value: project?.attributes.role,
  },
  {
    label: 'Project Type',
    value: project?.attributes.projectType,
  },
  {
    label: 'Duration',
    value: project?.attributes.duration,
  },
  {
    label: 'Skills Used',
    value: project?.attributes.technical_skills?.data,
  },
]

const longTextSections: LabelValue[] = [
  {
    label: 'Description',
    value: project?.attributes.description,
  },
  {
    label: 'Challenges and Solutions',
    value: project?.attributes.challengesAndSolutions,
  },
  {
    label: 'Results Achieved',
    value: project?.attributes.resultsAchieved,
  },
]

console.log('skills', project?.attributes.technical_skills?.data)

const handleClick = (mediaItem) => {
  modal.image = mediaItem?.attributes.url ? useStrapiMedia(mediaItem?.attributes.url) : ''
  modal.description = mediaItem?.attributes.alternativeText ?? ''
  modal.isVisible = true
}

useSeoMeta({
  title: project?.attributes.title,
  description: project?.attributes.description,
})

console.log('result', result)
</script>
