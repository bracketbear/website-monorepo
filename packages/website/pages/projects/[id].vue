<template>
  <NuxtLayout class="bg-primary-lightest">
    <div
      v-if="project"
      class="container relative flex min-h-screen flex-col gap-8 overflow-hidden py-8"
    >
      <!-- Title -->
      <h1 v-if="project.attributes.title" class="text-2xl font-bold sm:text-4xl lg:text-6xl">
        {{ project.attributes.title }}
      </h1>
      <!-- Main Image -->
      <div v-if="mainImageRoute" class="flex justify-center">
        <NuxtImg :src="mainImageRoute" class="max-h-[65vh] rounded-xl border-2 border-solid border-black bg-secondary hard-shadow-xl" />
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
            <NuxtImg v-if="mediaRoutes[index]" :src="mediaRoutes[index]" class="h-48 rounded border-2 border-solid border-white bg-secondary" />
          </button>
        </div>
      </div>
      <UiModal v-model:is-open="modal.isOpen" :fixed-size="false">
        <div v-if="modal.image" class="flex justify-center">
          <NuxtImg
            :src="modal.image"
            :alt="modal.alt"
            class="max-h-[calc(100vh-16rem)] max-w-full object-contain"
          />
        </div>
      </UiModal>
    </div>
    <!-- No project found... uh oh! -->
    <ProjectNotFound v-else />
  </NuxtLayout>
</template>

<script setup lang="ts">
import { ApiProjectProject } from '%/contentTypes'

const modal = reactive({
  image: '',
  caption: '',
  alt: '',
  isOpen: false,
})

const route = useRoute()
const projectId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
const collectionName: ApiProjectProject['collectionName'] = 'projects'
let project = null
let result = null
try {
  result = await useAsyncData(
    collectionName,
    () => useStrapi().findOne<ApiProjectProject['attributes']>(collectionName, projectId, {
      populate: ['mainImage', 'media', 'technical_skills'],
    }),
  )
  project = result.data.value?.data
} catch (error) {
  console.error(error)
}

const mainImage = project?.attributes.mainImage?.data ?? {}
const media = project?.attributes.media?.data ?? []
const mainImageRoute = mainImage?.attributes?.url ? useStrapiMedia(mainImage?.attributes?.url) : ''
const mediaRoutes = media.map(mediaItem => mediaItem?.attributes.url ? useStrapiMedia(mediaItem?.attributes.url) : '')
if (mainImage) {
  media.push(mainImage)
}

interface LabelValue {
  label: string;
  value: string;
}

const projectDetails: LabelValue[] = [
  {
    label: 'Role',
    value: project?.attributes.role ?? '',
  },
  {
    label: 'Project Type',
    value: project?.attributes.projectType ?? '',
  },
  {
    label: 'Duration',
    value: project?.attributes.duration ?? '',
  },
  {
    label: 'Skills Used',
    value: project?.attributes.technical_skills?.data ?? [],
  },
]

const longTextSections: LabelValue[] = [
  {
    label: 'Description',
    value: project?.attributes.description ?? '',
  },
  {
    label: 'Challenges and Solutions',
    value: project?.attributes.challengesAndSolutions ?? '',
  },
  {
    label: 'Results Achieved',
    value: project?.attributes.resultsAchieved ?? '',
  },
]

const handleClick = (mediaItem) => {
  modal.image = mediaItem?.attributes.url ? useStrapiMedia(mediaItem?.attributes.url) : ''
  modal.caption = mediaItem?.attributes.caption ?? ''
  modal.alt = mediaItem?.attributes.alternativeText ?? ''
  modal.isOpen = true
}

useSeoMeta({
  title: project?.attributes.title || 'Project Not Found',
  description: project?.attributes.description || 'Project Not Found',
})
</script>
