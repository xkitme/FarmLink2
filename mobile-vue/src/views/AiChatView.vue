<template>
  <div class="chat-page">
    <header class="chat-bar">
      <button type="button" class="chat-bar__back" aria-label="返回" @click="back"><van-icon name="arrow-left" size="20" /></button>
      <div class="chat-bar__title">
        <h1>AI 农技助手</h1>
        <span>{{ sceneLabel }}</span>
      </div>
      <button type="button" class="chat-bar__scene" @click="showScene = true"><van-icon name="exchange" size="18" /></button>
    </header>

    <main ref="scroll" class="chat-body">
      <div v-if="!messages.length" class="intro">
        <div class="intro__icon"><van-icon name="chat-o" size="30" /></div>
        <p>你好，我是田园通 AI 助手</p>
        <span>问天气、病虫害、政策、农技，我来帮你</span>
        <div class="intro__tips">
          <button v-for="t in tips" :key="t" type="button" @click="quickAsk(t)">{{ t }}</button>
        </div>
      </div>

      <div v-for="(m, i) in messages" :key="i" class="row" :class="'row--' + m.role">
        <span v-if="m.role === 'ai'" class="avatar"><van-icon name="chat-o" size="16" /></span>
        <div class="bubble" :class="'bubble--' + m.role">
          <span v-if="m.role === 'ai' && !m.content && streaming" class="typing"><i></i><i></i><i></i></span>
          <template v-else>{{ m.content }}</template>
        </div>
      </div>
    </main>

    <footer class="chat-input">
      <input v-model="draft" type="text" placeholder="输入你的问题…" enterkeyhint="send" :disabled="streaming" @keyup.enter="send" />
      <button v-if="streaming" type="button" class="chat-input__stop" @click="stop"><van-icon name="stop-circle-o" size="22" /></button>
      <button v-else type="button" class="chat-input__send" :disabled="!draft.trim()" @click="send"><van-icon name="guide-o" size="20" /></button>
    </footer>

    <van-action-sheet v-model="showScene" :actions="sceneActions" cancel-text="取消" @select="onScene" />
  </div>
</template>

<script>
import { streamChat } from '../api/client'

const SCENES = [
  { name: '综合问答', value: 'GENERAL' },
  { name: '农技咨询', value: 'AGRI' },
  { name: '政策解读', value: 'POLICY' },
  { name: '法律咨询', value: 'LEGAL' },
]

export default {
  name: 'AiChatView',
  data() {
    return {
      draft: '',
      scene: 'GENERAL',
      messages: [],
      streaming: false,
      threadId: null,
      showScene: false,
      stream: null,
      tips: ['稻瘟病怎么防治？', '今年有哪些种粮补贴？', '柑橘黄叶是什么原因？'],
    }
  },
  computed: {
    sceneLabel() { return (SCENES.find((s) => s.value === this.scene) || SCENES[0]).name },
    sceneActions() { return SCENES.map((s) => ({ name: s.name, value: s.value, color: s.value === this.scene ? '#386641' : undefined })) },
  },
  created() {
    const id = this.$route.params.threadId
    if (id && id !== 'new') this.threadId = id
  },
  beforeDestroy() {
    if (this.stream) this.stream.cancel()
  },
  methods: {
    back() {
      if (window.history.length > 1) this.$router.back()
      else this.$router.replace('/ai')
    },
    onScene(action) {
      this.scene = action.value
      this.showScene = false
    },
    quickAsk(text) {
      this.draft = text
      this.send()
    },
    scrollDown() {
      this.$nextTick(() => {
        const el = this.$refs.scroll
        if (el) el.scrollTop = el.scrollHeight
      })
    },
    send() {
      const q = this.draft.trim()
      if (!q || this.streaming) return
      this.draft = ''
      this.messages.push({ role: 'user', content: q })
      const aiMsg = { role: 'ai', content: '' }
      this.messages.push(aiMsg)
      this.streaming = true
      this.scrollDown()
      this.stream = streamChat({
        question: q,
        scene: this.scene,
        threadId: this.threadId || undefined,
        handlers: {
          onDelta: (delta) => {
            aiMsg.content += delta
            this.scrollDown()
          },
          onDone: (data) => {
            if (data && data.threadId) this.threadId = data.threadId
            if (!aiMsg.content) aiMsg.content = '（未获取到回答，请重试）'
            this.streaming = false
            this.stream = null
          },
          onError: () => {
            if (!aiMsg.content) aiMsg.content = 'AI 服务暂时不可用，请稍后重试。'
            this.streaming = false
            this.stream = null
          },
        },
      })
    },
    stop() {
      if (this.stream) this.stream.cancel()
      this.streaming = false
      this.stream = null
      const last = this.messages[this.messages.length - 1]
      if (last && last.role === 'ai' && !last.content) last.content = '（已停止）'
    },
  },
}
</script>

<style scoped>
.chat-page { display: flex; flex-direction: column; height: 100vh; height: 100dvh; background: #f4f1e4; }
.chat-bar { display: flex; align-items: center; gap: 8px; padding: calc(10px + env(safe-area-inset-top)) 14px 10px; background: #fff; border-bottom: 1px solid #ece7d8; }
.chat-bar__back, .chat-bar__scene { display: grid; width: 34px; height: 34px; padding: 0; color: #386641; background: none; border: 0; place-items: center; }
.chat-bar__scene { background: #edf4ee; border-radius: 50%; }
.chat-bar__title { flex: 1; text-align: center; }
.chat-bar__title h1 { margin: 0; font-size: 16px; font-weight: 700; color: #2f3a30; }
.chat-bar__title span { font-size: 11px; color: #a79f8c; }
.chat-body { flex: 1; overflow-y: auto; padding: 16px; }
.intro { display: flex; flex-direction: column; align-items: center; padding: 30px 20px; text-align: center; }
.intro__icon { display: grid; width: 60px; height: 60px; margin-bottom: 14px; color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); border-radius: 20px; place-items: center; }
.intro p { margin: 0; font-size: 16px; font-weight: 700; color: #2f3a30; }
.intro span { margin-top: 6px; font-size: 13px; color: #a79f8c; }
.intro__tips { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; width: 100%; }
.intro__tips button { padding: 12px 16px; color: #386641; font-size: 14px; text-align: left; background: #fff; border: 1px solid #d6e6d8; border-radius: 12px; }
.row { display: flex; gap: 8px; margin-bottom: 14px; }
.row--user { justify-content: flex-end; }
.avatar { display: grid; flex: 0 0 auto; width: 32px; height: 32px; color: #fff; background: #386641; border-radius: 50%; place-items: center; }
.bubble { max-width: 76%; padding: 11px 14px; font-size: 15px; line-height: 1.65; border-radius: 16px; white-space: pre-wrap; word-break: break-word; }
.bubble--user { color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); border-bottom-right-radius: 4px; }
.bubble--ai { color: #2f3a30; background: #fff; border: 1px solid #e5dfce; border-bottom-left-radius: 4px; }
.typing { display: inline-flex; gap: 4px; padding: 2px 0; }
.typing i { width: 6px; height: 6px; background: #b8b0a0; border-radius: 50%; animation: blink 1.2s infinite both; }
.typing i:nth-child(2) { animation-delay: .2s; }
.typing i:nth-child(3) { animation-delay: .4s; }
@keyframes blink { 0%, 80%, 100% { opacity: .3; } 40% { opacity: 1; } }
.chat-input { display: flex; align-items: center; gap: 10px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #ece7d8; }
.chat-input input { flex: 1; height: 42px; padding: 0 15px; font-size: 15px; color: #2f3a30; background: #f4f1e4; border: 1px solid #e5dfce; border-radius: 999px; }
.chat-input__send, .chat-input__stop { display: grid; width: 42px; height: 42px; flex: 0 0 auto; color: #fff; background: linear-gradient(135deg, #3e6b4f, #52b788); border: 0; border-radius: 50%; place-items: center; }
.chat-input__send:disabled { opacity: .5; }
.chat-input__stop { background: #ba1a1a; }
</style>
