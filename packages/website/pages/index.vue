<template>
  <NuxtLayout class="bg-primary">
    <!-- Hero -->
    <div class="h-[calc(100vh-4rem)] border-b-2 border-solid border-black bg-secondary-dark md:h-[calc(100vh-5rem)] ">
      <FlateralusCanvas
        :animation-class="ParticleGridAnimation"
        :config="animationConfig"
        class="h-full w-full"
      >
        <div class="flex h-full items-center">
          <div class="container flex flex-col items-center justify-center gap-3 text-center font-heading text-xl md:px-16">
            <div>Hi! My name is</div>
            <div class="text-5xl text-white shadow-white text-stroke text-hard-shadow sm:text-7xl md:text-8xl">
              Harrison
            </div>
            <div>I'm a full-stack developer with a background in design, immersive Experiences, and Generative A.I.</div>
            <div class="mt-4 flex w-full flex-col justify-center gap-4 md:flex-row">
              <NuxtLink to="#welcome">
                <UiButton color="white" class="w-full md:w-auto">
                  Learn More
                </UiButton>
              </NuxtLink>
              <NuxtLink to="#contact">
                <UiButton>Let's Chat!</UiButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </FlateralusCanvas>
    </div>
    <!-- Welcome -->
    <section class="py-[50vh]">
      <div class="mx-auto flex flex-col items-center gap-8 p-4 text-center font-heading text-2xl text-white text-stroke text-hard-shadow lg:max-w-2xl">
        <p>From my early days working at a microbrewery to crafting tailored web solutions at Bracket Bear, my path has been diverse.</p>
        <p>But the goal? Always the same: delivering top-notch digital experiences.</p>
      </div>
    </section>
    <!-- Work History -->
    <section class="py-[50vh]">
      <div class="mx-auto flex flex-col items-center gap-8 p-4 text-center font-heading text-2xl font-bold text-white text-hard-shadow lg:max-w-2xl">
        <p>Name an industry and there's a good chance that I've worked in it.</p>
        <p>From brews to boxes to mind blowing immersive experiences, I've been lucky to experience a ton of different things. Here's a brief timeline of my work history.</p>
      </div>
      <div class="mx-auto p-4 lg:max-w-2xl">
        <WorkHistory />
      </div>
    </section>
    <!-- Technical Skills -->
    <section class="py-[50vh]">
      <div class="mx-auto flex flex-col items-center gap-8 p-4 text-center font-heading text-2xl font-bold text-white text-hard-shadow lg:max-w-2xl">
        <p>In my digital toolbox, you'll find an array of tools, each with its own tale.</p>
        <p>From the elegance of Vue.js to the power of C++, these are the instruments of my symphony.</p>
      </div>
      <div class="mx-auto p-4">
        <SkillList />
      </div>
    </section>
    <!-- New Projects -->
    <section class="py-[50vh]">
      <div class="mx-auto flex flex-col items-center gap-8 p-4 text-center font-heading text-2xl font-bold text-white text-hard-shadow lg:max-w-2xl">
        <p>I’ve gotten to work on some cool projects over the years.</p>
        <p>Here are a handful of them.</p>
      </div>
      <div class="mx-auto p-4">
        <ProjectList />
      </div>
    </section>
    <!-- New Reach Out -->
    <section class="py-[50vh]">
      <div id="contact" class="mx-auto flex flex-col items-center gap-8 p-4 text-center font-heading text-2xl font-bold text-white text-hard-shadow lg:max-w-2xl">
        <p>Alrighty, I've said enough. Now I'd love to hear from you.</p>
        <p>Feel free to fill out the form below and I'll get back to you as soon as possible.</p>
      </div>
      <div class="mx-auto max-w-3xl p-4">
        <ContactForm />
      </div>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
// import ParticleGridAnimation, { ParticleGridConfig } from '~/utils/canvas/animations/particle-grid'

// const animationConfig: ParticleGridConfig = {
//   noiseStrength: 0,
//   particleColor: 'darkorange',
//   particleWidth: 50,
//   driftSpeed: 0,
//   repulsionStrength: 2,
//   xPad: -10,
//   yPad: -10,
// }

useSeoMeta({
  title: 'Home',
})
</script>
