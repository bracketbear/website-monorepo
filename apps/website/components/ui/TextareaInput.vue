<template>
  <textarea
    :value="modelValue"
    :class="inputClass"
    :placeholder="placeholder"
    :aria-required="required"
    @input="updateValue"
  />
</template>

<script lang="ts" setup>
import { ref, watchEffect, withDefaults } from 'vue'
import debounce from '~/utils/helpers/debounce'

interface Props {
  modelValue: string;
  inputClass?: string;
  placeholder?: string;
  debounceTime?: number;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  debounceTime: 300,
  required: false,
  inputClass: '',
  placeholder: '',
})

const emit = defineEmits<{(event: 'update:modelValue', value: string): void}>()

const modelValue = ref(props.modelValue)
const updateValue = debounce((event: Event) => {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}, props.debounceTime)

watchEffect(() => {
  modelValue.value = props.modelValue
})
</script>
