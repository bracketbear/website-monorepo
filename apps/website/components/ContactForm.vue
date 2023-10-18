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
      <UiButton color="secondary" type="submit" title="Click here to submit your message">
        Submit
      </UiButton>
    </div>
  </form>
  <div v-else>
    <p class="text-center font-heading text-2xl text-black">
      Thanks for reaching out!
    </p>
    <p class="text-center text-lg text-black">
      I'll get back to you as soon as possible.
    </p>
  </div>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import type { Component } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email, helpers } from '@vuelidate/validators'
import UiTextInput from './ui/TextInput.vue'
import UiTextareaInput from './ui/TextareaInput.vue'

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
const gtm = useGtm()

const hasSubmitted = ref(false)
const formData = reactive<FormData>({ name: '', email: '', message: '' })
const rules = reactive({
  name: { required: helpers.withMessage('Name is required', required) },
  email: {
    required: helpers.withMessage('Email is required', required),
    email: helpers.withMessage('Email must be a valid email address', email),
  },
  subject: { required: helpers.withMessage('The subject is required', required) },
  message: { required: helpers.withMessage('The message is required', required) },
})

const v$ = useVuelidate(rules, formData)

const formName = 'contact-form'
const formFields: FormField[] = [
  { label: 'Your Name', model: 'name', component: UiTextInput, placeholder: 'Jack' },
  { label: 'Your Email Address', model: 'email', component: UiTextInput, placeholder: 'Sparrow' },
  { label: 'Subject', model: 'subject', component: UiTextInput, placeholder: 'Why is the rum always gone?', class: 'md:col-span-2' },
  { label: 'Your Message', model: 'message', component: UiTextareaInput, placeholder: 'Did everyone see that? Because I will not be doing it again', class: 'md:col-span-2 [&_textarea]:h-64' },
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
      gtm?.trackEvent({ event: 'contact_form_submit' })
      emit('submit', formData)
    },
    (error) => {
      console.error(error)
    })
}

</script>
