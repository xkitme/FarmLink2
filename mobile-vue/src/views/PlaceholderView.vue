<template>
  <main class="placeholder-view">
    <section class="placeholder-view__panel">
      <span class="placeholder-view__eyebrow">FARMLINK</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
    </section>
  </main>
</template>

<script>
export default {
  name: 'PlaceholderView',
  computed: {
    title() {
      return this.$route.meta.title || '页面建设中'
    },
    description() {
      return this.$route.meta.description || '该路由已挂载，业务内容将在后续接入。'
    },
  },
}
</script>
