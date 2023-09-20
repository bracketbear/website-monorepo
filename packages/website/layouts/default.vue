<template>
  <div class="relative z-10 grid min-h-screen grid-rows-[4rem_auto_24rem] md:grid-rows-[5rem_auto_24rem]">
    <Navigation />
    <!-- Main content goes inside here. 👇 -->
    <main>
      <slot />
    </main>
    <Footer />
  </div>
</template>
