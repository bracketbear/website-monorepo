<template>
  <div class="flex w-full flex-col gap-3">
    <template v-for="(company, index) in companies" :key="company">
      <div class="flex h-52 flex-col items-center justify-center rounded-2xl border-2 border-solid border-black bg-red-400 font-heading transition-opacity">
        <p class="text-lg font-bold">
          {{ company.attributes.name }}
        </p>
        <p v-for="(job, i) in company.attributes.jobs.data" :key="i" class="text-sm">
          {{ job.attributes.name }}
        </p>
        <p class="text-sm" />
      </div>
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
