<template>
  <Teleport to="body">
    <div
      v-if="props.showModal"
      class="fixed inset-0 z-50 max-h-screen overflow-y-auto bg-black/80 p-8"
      role="dialog"
      aria-modal="true"
    >
      <div
        v-show="props.showModal"
        class="max-h-fit rounded-xl bg-white px-4 pb-4"
        v-bind="$attrs"
        @click.stop
      >
        <!-- Close button -->
        <div class="flex h-full justify-end py-2">
          <CloseButton size="small" @click="closeModal" />
        </div>
        <div class="max-h-full">
          <!-- Content -->
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
interface Props {
  showModal: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showModal: false,
})
const emit = defineEmits<{(event: 'update:showModal', value: boolean): void}>()

const closeModal = () => {
  emit('update:showModal', false)
}
</script>
