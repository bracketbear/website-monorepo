<template>
  <div class="flex w-full flex-col gap-3">
    <template v-for="(company, index) in companies" :key="company">
      <div class="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-solid border-black bg-secondary p-8 font-heading transition-opacity sm:aspect-video">
        <p class="text-base font-bold text-black sm:text-2xl">
          {{ company.attributes.name }}
        </p>
        <p class="mt-4 text-center text-sm text-black sm:text-lg">
          Duration:
        </p>
        <p class="text-center text-xs text-gray-800 sm:text-sm">
          {{ getFormattedDate(company.attributes.date_from) }} - {{ getFormattedDate(company.attributes.date_to) }}
        </p>
        <p class="mt-4 text-center text-sm text-black sm:text-lg">
          {{ company.attributes.jobs.data.length > 1 ? 'Roles:' : 'Role:' }}
        </p>
        <p v-for="(job, i) in company.attributes.jobs.data" :key="i" class="text-center text-xs text-gray-800 sm:text-sm">
          {{ job.attributes.name }}
        </p>
      </div>
      <WorkHistoryConnector v-if="companies.length > index + 1" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { ApiCompanyCompany } from '%/contentTypes'

// This will throw a TS error if the collection name ever changes.
const collectionName: ApiCompanyCompany['collectionName'] = 'companies'
const result = await useAsyncData(
  () => useStrapi().find<ApiCompanyCompany['attributes']>(collectionName, {
    populate: ['jobs'],
    sort: 'order:asc',
  }),
  { immediate: true },
)
const companies = result.data.value?.data ?? []

const getFormattedDate = (date: Attributes.Date) => {
  if (!date) { return 'Present' }

  const dateObj = new Date(date)
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}

const sections = [
  {
    title: 'Duration',
    value: (company: ApiCompanyCompany) => `${getFormattedDate(company.attributes.date_from)} - ${getFormattedDate(company.attributes.date_to)}`,
  },
]
</script>
