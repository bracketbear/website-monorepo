<template>
  <div class="flex w-full flex-col gap-3">
    <WorkHistoryBubble />
    <WorkHistoryConnector />
    <WorkHistoryBubble />
    <WorkHistoryConnector />
    <WorkHistoryBubble />
    <WorkHistoryConnector />
    <WorkHistoryBubble />
  </div>
</template>

<script lang="ts" setup>
const result = await useStrapi().find('jobs')
console.log('jobs', result.data)

</script>
