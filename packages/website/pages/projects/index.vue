<template>
  <NuxtLayout class="bg-red-500">
    <div class="container mx-auto px-4 py-8">
      <h1 class="mb-8 text-4xl font-bold">
        Projects
      </h1>
      <ProjectList />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import { Project } from '~/config/projects'

const projects = await useStrapi<Project>().find('projects', {
  populate: 'mainImage',
})

const projectBackgrounds = new Map()

projects.data.forEach((project) => {
  const mainImage = project.attributes.mainImage.data
  if (mainImage?.attributes.url) {
    projectBackgrounds.set(project.id, useStrapiMedia(mainImage.attributes.url))
  }
})

useSeoMeta({
  title: 'Projects',
})
</script>
