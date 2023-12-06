<template>
  <NuxtImg
    :src="src"
    :alt="props.media.attributes.alternativeText"
    :provider="computedProvider"
  />
</template>

<script setup lang="ts">
interface Props {
  media: {
    attributes: {
      alternativeText?: string,
      name?: string,
      hash?: string,
      ext?: string,
      url: string,
      provider: 'local' | 'aws-s3',
    }
  }
}

const props = defineProps<Props>()

const src = computed(() => {
  const { provider, hash, ext, url } = props.media.attributes

  switch (provider) {
    case 'aws-s3':
      return `/aws-s3/${hash}${ext}`
    case 'local':
      return `/strapi${url}`
    default:
      return url
  }
})

const computedProvider = computed(() => {
  return props.media.attributes.provider === 'local'
    ? 'strapi'
    : undefined
})
</script>
