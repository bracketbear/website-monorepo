import { Directive } from 'vue'

const ClickOutsideDirective: Directive = {
  beforeMount (el, binding) {
    el.clickOutsideEvent = function (event: Event) {
      // Check that click was outside the el and his children
      if (el !== event.target && !el.contains(event.target)) {
        // Call the provided method
        binding.value(event)
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted (el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  },
}

export default ClickOutsideDirective
