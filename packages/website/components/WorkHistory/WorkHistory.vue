<template>
  <div class="flex w-full flex-col gap-3">
    <template v-for="(company, index) in companies" :key="company">
      <SlideOverContainer class="rounded-3xl border-4 border-black bg-red-500">
        <template #content="{ isHovered }">
          <div :class="{ 'opacity-0': isHovered }" class="flex h-52 flex-col items-center justify-center font-heading transition-opacity">
            <p class="text-lg font-bold">
              {{ company.attributes.name }}
            </p>
            <p v-for="(job, i) in company.attributes.jobs.data" :key="i" class="text-sm">
              {{ job.attributes.name }}
            </p>
            <p class="text-sm" />
          </div>
        </template>
        <template #details="{ isHovered }">
          <div class="flex h-full flex-col items-center justify-center bg-black">
            <p class="text-sm">
              {{ company.attributes.description }}
            </p>
          </div>
        </template>
      </SlideOverContainer>
      <WorkHistoryConnector v-if="companies.length > index + 1" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ApiCompanyCompany } from '%/contentTypes'

const collectionName: ApiCompanyCompany['collectionName'] = 'companies'
const result = await useStrapi<ApiCompanyCompany['attributes']>().find(collectionName, {
  populate: ['jobs'],
  sort: 'order:asc',
})
const companies = result.data
</script>
