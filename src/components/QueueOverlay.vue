<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <teleport to="body" v-if="visible">
    <div class="qn-overlay" @click="onBackdropClick" :style="overlayStyle">
      <section
        class="qn-window"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        :class="[`qn-${size}`, theme]"
        @click.stop
      >
        <button
          v-if="closable"
          class="qn-close"
          @click="handleClose"
          aria-label="Fenster schließen"
        >
          ×
        </button>

        <div class="qn-content" role="status" aria-live="polite">
          <h1 class="qn-title">{{ title }}</h1>
          <p class="qn-sub">{{ subtitle }}</p>

          <div class="qn-notice" aria-hidden="true">
            <span>{{ loadingLabel }}</span>
            <span class="qn-dot"></span>
            <span class="qn-dot"></span>
            <span class="qn-dot"></span>
          </div>
        </div>
      </section>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'

interface Props {
  /** Externe Variable, z. B. "wait_res" */
  waitRes: boolean
  /** Wartezeit bis die Komponente angezeigt wird (ms) */
  delayMs?: number
  title?: string
  subtitle?: string
  loadingLabel?: string
  size?: 'sm' | 'md' | 'lg'
  theme?: 'dark' | 'light'
  closable?: boolean
  closeOnBackdrop?: boolean
  overlayColor?: string
  /** Wenn true, wird beim Wechsel auf false sofort ausgeblendet (ohne Delay). */
  immediateHide?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  delayMs: 5000,
  title: 'TOP Assist ist gerade sehr beliebt 🎉',
  subtitle: 'Danke für deinen Besuch! Es kann einen Moment dauern, bis du an der Reihe bist.',
  loadingLabel: 'Einen Augenblick bitte',
  size: 'md',
  theme: 'dark',
  closable: false,
  closeOnBackdrop: false,
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  immediateHide: true,
})

const emit = defineEmits<{ (e: 'close'): void }>()

const visible = ref(false)
let t: number | undefined

const overlayStyle = computed(() => ({ background: props.overlayColor }))

function clearTimer() {
  if (t) {
    clearTimeout(t)
    t = undefined
  }
}

function scheduleShow() {
  clearTimer()
  t = window.setTimeout(() => {
    // Nur anzeigen, wenn immer noch true
    if (props.waitRes) visible.value = true
  }, props.delayMs)
}

// Reagiere auf waitRes-Änderungen
watch(
  () => props.waitRes,
  (val) => {
    if (val) {
      // Startet/erneuert den 5s-Timer
      scheduleShow()
    } else {
      clearTimer()
      if (props.immediateHide) visible.value = false
    }
  },
  { immediate: true },
)

function handleClose() {
  visible.value = false
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) handleClose()
}

onBeforeUnmount(() => clearTimer())
</script>

<style scoped>
.qn-overlay {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  z-index: 9999;
}
.qn-window {
  width: min(680px, 92vw);
  border-radius: 16px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
  border: 1px solid var(--qn-border);
  background: var(--qn-bg);
  color: var(--qn-text);
  position: relative;
}
.qn-sm {
  width: min(520px, 92vw);
}
.qn-md {
  width: min(680px, 92vw);
}
.qn-lg {
  width: min(860px, 96vw);
}
.qn-content {
  padding: 24px 22px 22px;
  text-align: center;
}
.qn-title {
  margin: 0 0 8px;
  font-size: clamp(20px, 2.4vw + 10px, 28px);
}
.qn-sub {
  margin: 0 0 18px;
  opacity: 0.9;
}
.qn-notice {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.qn-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--qn-accent);
  opacity: 0.35;
  animation: qn-bounce 1.4s ease-in-out infinite;
}
.qn-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.qn-dot:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes qn-bounce {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  50% {
    transform: translateY(-3px);
    opacity: 1;
  }
}
.qn-close {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--qn-border);
  background: transparent;
  color: var(--qn-text);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.qn-close:hover {
  background: var(--qn-hover);
}
.dark {
  --qn-bg: #0b1020;
  --qn-text: #e8ecfb;
  --qn-accent: #589b79;
  --qn-border: rgba(255, 255, 255, 0.14);
  --qn-hover: rgba(255, 255, 255, 0.08);
}
.light {
  --qn-bg: #ffffff;
  --qn-text: #0b1020;
  --qn-accent: #589b79;
  --qn-border: rgba(2, 6, 23, 0.1);
  --qn-hover: rgba(2, 6, 23, 0.05);
}
@media (prefers-reduced-motion: reduce) {
  .qn-dot {
    animation: none;
  }
}
</style>
