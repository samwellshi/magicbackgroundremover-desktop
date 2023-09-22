<script setup>
import BGRemoval from './components/BGRemoval.vue'
</script>

<template>
  <div class="container xl">
    <!-- <h1 class="text-3xl font-bold underline">
    Hello world!
  </h1>     -->
  </div>
  <BGRemoval  />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
