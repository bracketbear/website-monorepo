<template>
  <div class="flex flex-col gap-8">
    <!-- Categories -->
    <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
      <!-- Category Pill -->
      <button v-for="category in categories" :key="category" @click="() => onCategoryClick(category)">
        <UiPill
          :key="category"
          :label="category"
          :is-active="isActiveCategory(category)"
        />
      </button>
    </div>
    <!-- Grid of skills -->
    <div class="mx-auto grid grid-cols-3 justify-center gap-6 md:grid-cols-4 xl:grid-cols-6">
      <!-- TODO: add some sort of animation here so the items -->
      <!-- TODO: figure out in the future how we actually want to initially order skills -->
      <template v-for="skill in skillsByRank" :key="skill">
        <div
          v-if="isActiveCategory(skill.category) || isActiveCategory(ALL_CATEGORY)"
          class="flex aspect-square w-32 flex-wrap items-center justify-center rounded-full border-2 border-solid border-black bg-red-700 p-4 hard-shadow-xl"
        >
          <p class="text-center font-heading text-sm text-white text-hard-shadow">
            {{ skill.attributes.label }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { SkillCategory } from '~/config/technical-skills'

const ALL_CATEGORY = 'All'

const skills = await useStrapi<SkillCategory>().find('skill-categories', {
  populate: {
    technical_skills: {
      sort: 'rating:desc',
    },
  },
})

const activeCategory = ref(ALL_CATEGORY)
const categories = computed(() => {
  // We always want to show the "All" category
  const labels: string[] = [ALL_CATEGORY]

  skills.data.forEach((category) => {
    // We don't want empty categories
    if (category.attributes.technical_skills?.data.length > 0) {
      labels.push(category.attributes.label)
    }
  })

  return labels
})

const onCategoryClick = (category: string) => {
  activeCategory.value = category
}

const isActiveCategory = computed(() => (category: string) => {
  return category === activeCategory.value
})

const skillsByRank = computed(() => {
  const skillsByRank: {[key: number]: any[]} = {}

  skills.data.forEach((category) => {
    const data = category.attributes.technical_skills?.data

    data?.forEach((skill) => {
      if (!skillsByRank[skill.attributes.rating]) {
        skillsByRank[skill.attributes.rating] = []
      }

      skill.category = category.attributes.label
      skillsByRank[skill.attributes.rating].push(skill)
    })
  })

  return Object.values(skillsByRank).flat().reverse()
})
</script>
