<template>
  <SettingsScaffold :title="doc.title" fallback="/profile/settings">
    <section v-for="section in doc.sections" :key="section.title" class="legal-section">
      <h2>{{ section.title }}</h2>
      <p>{{ section.body }}</p>
    </section>
  </SettingsScaffold>
</template>

<script>
import SettingsScaffold from '../../components/SettingsScaffold.vue'
import { LEGAL_DOCS } from '../../data/legal.js'

export default {
  name: 'LegalView',
  components: { SettingsScaffold },
  computed: {
    doc() {
      const key = this.$route.meta && this.$route.meta.doc
      return LEGAL_DOCS[key] || LEGAL_DOCS.service
    },
  },
}
</script>

<style scoped>
.legal-section { margin-bottom: 18px; }
.legal-section h2 { margin: 0 0 8px; color: #386641; font-size: 15px; font-weight: 700; }
.legal-section p { margin: 0; color: #4e554c; font-size: 13px; line-height: 1.78; white-space: pre-wrap; }
</style>
