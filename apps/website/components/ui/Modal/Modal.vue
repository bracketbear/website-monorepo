<template>
  <Teleport to="body">
    <div
      v-if="props.showModal"
      class="fixed inset-0 z-50 overflow-y-auto bg-black/80"
      role="dialog"
      aria-modal="true"
    >
      <div
        v-show="props.showModal"
        class="relative mx-auto mt-10 max-h-screen max-w-max rounded-xl bg-white px-4 pb-4"
        v-bind="$attrs"
        @click.stop
      >
        <!-- Close button -->
        <div class="flex justify-end py-2">
          <CloseButton size="small" @click="closeModal" />
        </div>
        <!-- Content -->
        <slot />
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
