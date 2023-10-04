<template>
  <div class="flex w-full flex-col gap-3">
    <template v-for="(company, index) in companies" :key="company">
      <div class="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border-2 border-solid border-black bg-secondary font-heading transition-opacity">
        <p class="text-2xl font-bold text-black">
          {{ company.attributes.name }}
        </p>
        <p class="mt-4 text-lg text-black">
          Duration:
        </p>
        <p class="text-sm text-gray-800">
          {{ getFormattedDate(company.attributes.date_from) }} - {{ getFormattedDate(company.attributes.date_to) }}
        </p>
        <p class="mt-4 text-lg text-black">
          Roles:
        </p>
        <p v-for="(job, i) in company.attributes.jobs.data" :key="i" class="text-sm text-gray-800">
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
  collectionName,
  () => useStrapi().find<ApiCompanyCompany['attributes']>(collectionName, {
    populate: ['jobs'],
    sort: 'order:asc',
  }),
)
const companies = result.data.value?.data ?? []

const getFormattedDate = (date: string) => {
  if (!date) { return 'Present' }

  const dateObj = new Date(date)
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  })
}
</script>
