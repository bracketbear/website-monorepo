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
useSeoMeta({
  title: 'Projects',
})
</script>
