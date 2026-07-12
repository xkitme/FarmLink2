<template>
  <div class="uploader">
    <div v-for="(url, i) in value" :key="url" class="uploader__item">
      <img :src="resolve(url)" alt="" />
      <button type="button" class="uploader__del" aria-label="删除" @click="remove(i)"><van-icon name="cross" size="13" /></button>
    </div>
    <label v-if="value.length < max" class="uploader__add" :class="{ 'is-busy': uploading }">
      <van-loading v-if="uploading" size="20" />
      <template v-else><van-icon name="photograph" size="22" /><span>{{ value.length }}/{{ max }}</span></template>
      <input type="file" accept="image/*" :disabled="uploading" @change="onPick" />
    </label>
  </div>
</template>

<script>
import { uploadImage, resolveImageUrl } from '../api/client'

export default {
  name: 'ImageUploader',
  props: {
    value: { type: Array, default: () => [] },
    max: { type: Number, default: 6 },
  },
  data() {
    return { uploading: false }
  },
  methods: {
    resolve(url) { return resolveImageUrl(url) },
    async onPick(e) {
      const file = e.target.files && e.target.files[0]
      e.target.value = ''
      if (!file) return
      if (file.size > 8 * 1024 * 1024) {
        this.$toast('图片不能超过 8MB')
        return
      }
      this.uploading = true
      try {
        const data = await uploadImage(file)
        const url = data && data.url
        if (url) this.$emit('input', this.value.concat(url))
      } catch (err) {
        this.$toast((err && err.message) || '上传失败')
      } finally {
        this.uploading = false
      }
    },
    remove(i) {
      const next = this.value.slice()
      next.splice(i, 1)
      this.$emit('input', next)
    },
  },
}
</script>

<style scoped>
.uploader { display: flex; flex-wrap: wrap; gap: 10px; }
.uploader__item { position: relative; width: 78px; height: 78px; border-radius: 12px; overflow: hidden; }
.uploader__item img { width: 100%; height: 100%; object-fit: cover; }
.uploader__del { position: absolute; top: 2px; right: 2px; display: grid; width: 20px; height: 20px; padding: 0; color: #fff; background: rgba(0,0,0,.5); border: 0; border-radius: 50%; place-items: center; }
.uploader__add { display: grid; place-items: center; width: 78px; height: 78px; color: #9db5a3; background: #f4f7f2; border: 1.5px dashed #cfe0d3; border-radius: 12px; cursor: pointer; }
.uploader__add.is-busy { cursor: default; }
.uploader__add span { margin-top: 3px; font-size: 11px; }
.uploader__add input { display: none; }
</style>
