<template>
  <div class="relative z-10 min-h-screen md:grid md:grid-rows-[5rem_auto_24rem]">
    <Navigation />
    <!-- Main content goes inside here. 👇 -->
    <main>
      <slot />
    </main>
    <Footer />
  </div>
</template>
