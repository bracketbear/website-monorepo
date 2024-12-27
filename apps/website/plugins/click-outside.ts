import { defineNuxtPlugin } from '#app'
import ClickOutsideDirective from '~/directives/click-outside'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('click-outside', ClickOutsideDirective)
})
