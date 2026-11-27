<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, shallowRef, watch, watchEffect } from 'vue'
import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom'
import { operatorMatchLabels, type OperatorHighlight } from '@/operatorHighlights'
import { catalogStatus, definitions, loadDefinitions } from './operatorDefinitions'

const props = defineProps<{
  input?: OperatorHighlight[]
  output?: OperatorHighlight[]
  translationMode: boolean
}>()
const workspace = ref<HTMLElement>()
const popup = ref<HTMLElement>()
const anchor = shallowRef<HTMLElement>()
const active = computed(() => {
  const data = anchor.value?.dataset
  if (!data) return
  const operators = data.side === 'input' ? props.input : props.output
  return operators?.[Number(data.operator)]
})
const entry = computed(() =>
  definitions.value?.get((active.value?.lemma ?? active.value?.token ?? '').toLowerCase()),
)
let closeTimer: ReturnType<typeof setTimeout> | undefined

function cancelClose() {
  clearTimeout(closeTimer)
}
function close() {
  cancelClose()
  anchor.value = undefined
}
function scheduleClose() {
  cancelClose()
  closeTimer = setTimeout(close, 150)
}
function mark(target: EventTarget | null) {
  return target instanceof Element
    ? target.closest<HTMLElement>('[data-side][data-operator]')
    : null
}
function inspect(event: Event) {
  const element = mark(event.target)
  if (!element) return
  cancelClose()
  anchor.value = element
  if (catalogStatus.value === 'idle' || catalogStatus.value === 'error') void loadDefinitions()
}
function leave(event: PointerEvent | FocusEvent) {
  if (
    !mark(event.target) ||
    mark(event.relatedTarget) ||
    popup.value?.contains(event.relatedTarget as Node | null)
  )
    return
  if (event.type === 'pointerout' && document.activeElement === anchor.value) return
  scheduleClose()
}
function outside(event: Event) {
  if (!mark(event.target) && !popup.value?.contains(event.target as Node)) close()
}
function escape(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

watch([() => props.input, () => props.output, () => props.translationMode], close)
watchEffect(
  (onCleanup) => {
    const element = anchor.value
    const tooltip = popup.value
    if (!element || !tooltip || !active.value) return
    const side = element.dataset.side === 'input' ? 'output' : 'input'
    const paired = workspace.value?.querySelectorAll<HTMLElement>(
      `[data-side="${side}"][data-operator="${active.value.counterpart}"]`,
    )
    // Paint the paired occurrence without mutating ProseMirror's document DOM.
    const outlines = Array.from(paired ?? [], (node) =>
      node.animate([{ outline: '2px solid currentColor' }], { duration: 0, fill: 'forwards' }),
    )
    let mounted = true
    const stop = autoUpdate(element, tooltip, async () => {
      const { x, y } = await computePosition(element, tooltip, {
        placement: 'top',
        strategy: 'fixed',
        middleware: [offset(5), flip(), shift({ padding: 8 })],
      })
      if (mounted) Object.assign(tooltip.style, { left: x + 'px', top: y + 'px' })
    })
    onCleanup(() => {
      mounted = false
      stop()
      outlines.forEach((outline) => outline.cancel())
    })
  },
  { flush: 'post' },
)

onMounted(() => {
  document.addEventListener('pointerdown', outside)
  document.addEventListener('focusin', outside)
  document.addEventListener('keydown', escape)
})
onBeforeUnmount(() => {
  cancelClose()
  document.removeEventListener('pointerdown', outside)
  document.removeEventListener('focusin', outside)
  document.removeEventListener('keydown', escape)
})
</script>

<template>
  <div
    ref="workspace"
    @pointerover="inspect"
    @pointerout="leave"
    @focusin="inspect"
    @focusout="leave"
    @click="inspect"
  >
    <slot />
    <Teleport to="body">
      <div
        v-if="active"
        :id="anchor?.getAttribute('aria-describedby') ?? undefined"
        ref="popup"
        role="tooltip"
        class="operator-detail"
        @pointerenter="cancelClose"
        @pointerleave="scheduleClose"
      >
        <strong>{{ entry?.operator ?? active.lemma ?? active.token }}</strong> („{{
          active.token
        }}“)
        <p>
          {{
            entry?.definition ??
            (catalogStatus === 'loading'
              ? 'Definition wird geladen …'
              : 'Definition nicht verfügbar.')
          }}
        </p>
        <span class="operator-highlight" :data-match="active.match">{{
          active.match
            ? operatorMatchLabels[active.match]
            : 'Blau · Erkannter Operator im Ausgangstext.'
        }}</span>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.operator-detail {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  box-sizing: border-box;
  width: max-content;
  max-width: min(23rem, calc(100vw - 1rem));
  padding: 0.75rem;
  background: white;
  border: 1px solid #aaa;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px #0002;
}
.operator-detail p {
  margin: 0.4rem 0;
}
</style>
