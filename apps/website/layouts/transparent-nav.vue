<template>
  <div class="relative">
    <AppNavigation :transparent="true" class="!absolute z-10 w-full" @mousemove.stop />
    <div class="grid-cols-[1,-1] grid-rows-[1,2]">
      <slot />
    </div>
    <Footer class="grid-cols-[1,-1] grid-rows-[-1,-2]" />
  </div>
</template>
