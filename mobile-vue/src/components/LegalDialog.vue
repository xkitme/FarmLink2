<template>
  <transition name="legal-fade">
    <div v-if="visible" class="legal-mask" @click.self="onMaskClick">
      <div class="legal-sheet" role="dialog" aria-modal="true">
        <header class="legal-sheet__head">
          <h2>{{ title }}</h2>
          <button v-if="!consentMode" type="button" class="legal-sheet__close" aria-label="关闭" @click="$emit('close')">
            <van-icon name="cross" size="18" />
          </button>
        </header>
        <div class="legal-sheet__body">
          <section v-for="section in sections" :key="section.title" class="legal-section">
            <h3>{{ section.title }}</h3>
            <p>{{ section.body }}</p>
          </section>
        </div>
        <footer v-if="consentMode" class="legal-sheet__foot">
          <button type="button" class="legal-btn legal-btn--ghost" @click="$emit('decline')">不同意</button>
          <button type="button" class="legal-btn legal-btn--primary" @click="$emit('agree')">同意并继续</button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LegalDialog',
  props: {
    visible: { type: Boolean, default: false },
    title: { type: String, default: '' },
    sections: { type: Array, default: () => [] },
    consentMode: { type: Boolean, default: false },
  },
  methods: {
    onMaskClick() {
      // 同意模式下点遮罩不关闭，强制用户明确选择。
      if (!this.consentMode) this.$emit('close')
    },
  },
}
</script>

<style scoped>
.legal-mask { position: fixed; inset: 0; z-index: 200; display: flex; align-items: flex-end; justify-content: center; padding: 0; background: rgba(16, 33, 26, .6); }
.legal-sheet { display: flex; flex-direction: column; width: 100%; max-width: 600px; max-height: 86vh; background: #f7f4e9; border-radius: 22px 22px 0 0; box-shadow: 0 -12px 40px rgba(16, 33, 26, .28); }
.legal-sheet__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #e5dfce; }
.legal-sheet__head h2 { margin: 0; font-size: 17px; font-weight: 800; color: #2f3a30; }
.legal-sheet__close { display: grid; width: 32px; height: 32px; padding: 0; color: #726a57; background: #ece7d8; border: 0; border-radius: 50%; place-items: center; }
.legal-sheet__body { flex: 1; overflow-y: auto; padding: 14px 20px 20px; -webkit-overflow-scrolling: touch; }
.legal-section { margin-bottom: 16px; }
.legal-section h3 { margin: 0 0 7px; font-size: 14px; font-weight: 700; color: #386641; }
.legal-section p { margin: 0; font-size: 13px; line-height: 1.72; color: #4e554c; white-space: pre-wrap; }
.legal-sheet__foot { display: grid; grid-template-columns: 1fr 1.4fr; gap: 12px; padding: 12px 20px calc(14px + env(safe-area-inset-bottom)); border-top: 1px solid #e5dfce; background: #f7f4e9; }
.legal-btn { height: 46px; border: 0; border-radius: 12px; font-size: 15px; font-weight: 700; }
.legal-btn--ghost { color: #726a57; background: #ece7d8; }
.legal-btn--primary { color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); box-shadow: 0 8px 18px rgba(45, 106, 79, .28); }
.legal-fade-enter-active, .legal-fade-leave-active { transition: opacity .2s ease; }
.legal-fade-enter, .legal-fade-leave-to { opacity: 0; }
</style>
