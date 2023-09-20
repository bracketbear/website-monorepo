<template>
  <input
    :value="modelValue"
    :class="inputClass"
    :type="type"
    :placeholder="placeholder"
    :aria-required="required"
    @input="updateValue"
  />
</template>

<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import debounce from '~/utils/helpers/debounce'

interface Props {
  modelValue: string;
  inputClass?: string;
  placeholder?: string;
  debounceTime?: number;
  type?: string;
  required?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  debounceTime: 300,
  type: 'text',
  required: false,
  inputClass: '',
  placeholder: '',
})

const emit = defineEmits<{(event: 'update:modelValue', value: string): void}>()

const modelValue = ref(props.modelValue)
const updateValue = debounce((event: Event) => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}, props.debounceTime)

watchEffect(() => {
  modelValue.value = props.modelValue
})
</script>
