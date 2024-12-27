import { Directive } from 'vue'

const ClickOutsideDirective: Directive = {
  beforeMount (el, binding) {
    el.clickOutsideEvent = function (event: Event) {
      console.log('click', el, event.target, binding)
      console.log('ClickOutsideDirective: contains event.target', el.contains(event.target))
      // Check that click was outside the el and his children
      if (el !== event.target && !el.contains(event.target)) {
        // Call the provided method
        binding.value(event)
        console.log('ClickOutsideDirective: call binding.value')
      }
    }
    document.body.addEventListener('click', el.clickOutsideEvent)
  },
  unmounted (el) {
    document.body.removeEventListener('click', el.clickOutsideEvent)
  },
}

export default ClickOutsideDirective
