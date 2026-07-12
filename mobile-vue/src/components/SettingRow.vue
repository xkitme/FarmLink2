<template>
  <button type="button" class="setting-row" @click="$emit('click')">
    <span class="setting-row__icon"><van-icon :name="icon" size="19" /></span>
    <span class="setting-row__main">
      <em>{{ label }}</em>
      <small v-if="subtitle">{{ subtitle }}</small>
    </span>
    <span v-if="value" class="setting-row__value">{{ value }}</span>
    <van-icon name="arrow" size="15" color="#c3bba6" />
  </button>
</template>

<script>
export default {
  name: 'SettingRow',
  props: {
    icon: { type: String, default: 'setting-o' },
    label: { type: String, required: true },
    subtitle: { type: String, default: '' },
    value: { type: String, default: '' },
  },
}
</script>

<style scoped>
.setting-row { display: flex; align-items: center; gap: 12px; width: 100%; padding: 14px; background: none; border: 0; text-align: left; }
.setting-row__icon { display: grid; flex: 0 0 auto; width: 28px; height: 28px; color: #386641; place-items: center; }
.setting-row__main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.setting-row__main em { color: #2f3a30; font-size: 15px; font-style: normal; }
.setting-row__main small { color: #a79f8c; font-size: 12px; }
.setting-row__value { flex: 0 0 auto; color: #a79f8c; font-size: 13px; }
</style>
