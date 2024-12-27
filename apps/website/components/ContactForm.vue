<template>
  <form
    v-if="!hasSubmitted"
    :name="formName"
    data-netlify="true"
    class="grid gap-4 md:grid-cols-2"
    @submit.prevent="handleSubmit"
  >
    <!-- We need this for Netlify's forms. -->
    <input type="hidden" name="form-name" :value="formName" />
    <UiFormField
      v-for="(field, index) in formFields"
      :key="index"
      :label="field.label"
      label-position="top"
      :required="true"
      :class="field.class"
      :error="v$[field.model].$errors[0]?.$message ?? null"
    >
      <component
        :is="field.component"
        v-model="formData[field.model]"
        input-class="form-input"
        :name="field.model"
        :placeholder="field.placeholder"
        :required="!!rules[field.model].required"
      />
    </UiFormField>
    <small class="col-span-full font-bold text-black">An asterisk (*) means that the field is required.</small>
    <div class="mt-4 flex justify-center md:col-span-2">
      <UiButton color="secondary" type="submit">
        Submit
      </UiButton>
    </div>
  </form>
  <div v-else>
    <div class="text-center text-2xl font-bold text-white">
      Thanks for reaching out!
    </div>
    <div class="text-center text-xl text-white">
      I'll get back to you as soon as possible.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import type { Component } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, helpers } from '@vuelidate/validators'
import UiTextInput from './ui/TextInput/TextInput.vue'
import UiTextareaInput from './ui/TextareaInput/TextareaInput.vue'

interface FormData {
  name: string;
  email: string;
  message: string;
}

interface FormField {
  label: string;
  model: string;
  component: Component;
  placeholder: string;
  class?: string;
}

const emit = defineEmits<{(event: 'submit', value: FormData): void}>()

const hasSubmitted = ref(false)
const formData = reactive<FormData>({ name: '', email: '', message: '' })
const rules = reactive({
  name: { required: helpers.withMessage('Name is required', required) },
  email: {
    required: helpers.withMessage('Email is required', required),
    email: helpers.withMessage('Email must be valid', email),
  },
  message: { required: helpers.withMessage('Message is required', required) },
})

const v$ = useVuelidate(rules, formData)

const formName = 'contact-form'
const formFields: FormField[] = [
  { label: 'Your Name', model: 'name', component: UiTextInput, placeholder: 'Jack' },
  { label: 'Your Email', model: 'email', component: UiTextInput, placeholder: 'Sparrow' },
  { label: 'Your Message', model: 'message', component: UiTextareaInput, placeholder: 'Why is the rum always gone?', class: 'md:col-span-2' },
]

const handleSubmit = () => {
  v$.value.$touch()

  if (v$.value.$error) {
    return
  }

  const formKeyValues = Object.entries(formData)
  // const newFormData = new FormData()
  // formKeyValues.forEach(([key, value]) => newFormData.append(key, value))

  const urlEncodedFormData = new URLSearchParams(formKeyValues)
  urlEncodedFormData.append('form-name', 'contact-form')

  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: urlEncodedFormData.toString(),
  })
    .then(() => {
      hasSubmitted.value = true
      emit('submit', formData)
    },
    (error) => {
      console.error(error)
    })
}

</script>
