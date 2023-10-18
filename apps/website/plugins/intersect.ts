// ~/plugins/intersection-observer.ts
import { defineNuxtPlugin } from '#app'

/**
 * A Nuxt.js plugin that defines a custom Vue.js directive for intersection observation.
 * The directive, named 'intersect', triggers a callback function when an element becomes visible in the viewport.
 * This is useful for lazy loading images, infinite scrolling, and other UI/UX patterns.
 *
 * @example
 * // In your Vue component
 * <template>
 *   <div v-intersect="{ callback: loadMore, threshold: 0.5, stopObservingAfterIntersect: true }">
 *     <!-- Your content here -->
 *   </div>
 * </template>
 *
 * <script>
 * export default {
 *   methods: {
 *     loadMore(entry) {
 *       console.log('The div is now visible in the viewport. Load more content!');
 *       // Your logic to load more content goes here.
 *     },
 *   },
 * }
 * </script>
 *
 * @param {Object} nuxtApp - The Nuxt.js application instance.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('intersect', {
    /**
     * Called before the element is mounted to the DOM.
     *
     * @param {HTMLElement} el - The DOM element that the directive is bound to.
     * @param {{ callback: (entry: IntersectionObserverEntry) => void, threshold?: number, stopObservingAfterIntersect?: boolean }} binding - An object containing the directive's bound value and arguments.
     * The `callback` is a function that is called when the element intersects with the viewport.
     * The `threshold` is a number between 0 and 1 that specifies at what percentage of the target's visibility the observer's callback should be executed.
     * The `stopObservingAfterIntersect` is a boolean that specifies whether to stop observing the element after it has intersected with the viewport.
     */
    beforeMount (el, binding) {
      el.intersectionObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0] && entries[0].isIntersecting && typeof binding.value.callback === 'function') {
            binding.value.callback(entries[0])
            if (binding.value.stopObservingAfterIntersect) {
              console.log('stopObservingAfterIntersect', binding.value.stopObservingAfterIntersect)
              el.intersectionObserver.unobserve(el)
            }
          }
        },
        {
          threshold: typeof binding.value.threshold === 'number' ? Number(binding.value.threshold) : 0.5,
        },
      )
      el.intersectionObserver.observe(el)
    },
    /**
     * Called when the element is unmounted from the DOM.
     *
     * @param {HTMLElement} el - The DOM element that the directive was bound to.
     */
    unmounted (el) {
      el.intersectionObserver.disconnect()
    },
  })
})
