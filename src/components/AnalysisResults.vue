<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, watch } from 'vue'
import type { Barrier, OperatorAnalysis } from '@/api'
import { definitions, catalogStatus, loadDefinitions } from './operatorDefinitions'
import BarrierInfo from './BarrierInfo.vue'

const tabs = ['Barrieren', 'Operatoren'] as const
type Tab = (typeof tabs)[number]
const tab = defineModel<Tab>('tab', { required: true })
const props = defineProps<{
  barriers: Barrier[]
  analysis?: OperatorAnalysis
  status: 'idle' | 'loading' | 'ready' | 'error'
}>()

const operatorRows = computed(() => {
  const analysis = props.analysis
  return analysis?.operators.map((operator, index) => {
    const lemma = analysis.operators_lemmatized?.[index] ?? operator
    const entry = definitions.value?.get(lemma.toLowerCase())
    const name = entry?.operator ?? lemma
    return {
      title: name.charAt(0).toUpperCase() + name.slice(1),
      textForm: analysis.occurrences?.[index]?.token ?? operator,
      definition: entry?.definition,
    }
  })
})
watch(tab, (selected) => {
  if (selected === 'Operatoren' && catalogStatus.value === 'idle') void loadDefinitions()
})

function navigate(event: KeyboardEvent) {
  let next: Tab
  switch (event.key) {
    case 'ArrowLeft':
    case 'ArrowRight':
      next = tab.value === 'Barrieren' ? 'Operatoren' : 'Barrieren'
      break
    case 'Home':
      next = 'Barrieren'
      break
    case 'End':
      next = 'Operatoren'
      break
    default:
      return
  }
  event.preventDefault()
  tab.value = next
  document.getElementById('tab-' + next)?.focus()
}
</script>

<template>
  <section class="analysis-results">
    <div role="tablist" aria-label="Analyseergebnisse" @keydown="navigate">
      <button
        v-for="name in tabs"
        :id="'tab-' + name"
        :key="name"
        role="tab"
        :aria-selected="tab === name"
        :aria-controls="'panel-' + name"
        :tabindex="tab === name ? 0 : -1"
        @click="tab = name"
      >
        {{ name }}
      </button>
    </div>
    <div
      v-show="tab === 'Barrieren'"
      id="panel-Barrieren"
      role="tabpanel"
      aria-labelledby="tab-Barrieren"
      tabindex="0"
    >
      <BarrierInfo :barriers="barriers" />
    </div>
    <div
      v-show="tab === 'Operatoren'"
      id="panel-Operatoren"
      role="tabpanel"
      aria-labelledby="tab-Operatoren"
      tabindex="0"
    >
      <div role="status">
        <p v-if="status === 'loading'">Operatoren werden ermittelt …</p>
        <p v-else-if="status === 'error'">Operatorenanalyse nicht verfügbar.</p>
        <p v-else-if="analysis && !analysis.operators.length">Keine Operatoren gefunden.</p>
        <template v-if="analysis?.operators.length">
          <p v-if="catalogStatus === 'loading'">Definitionen werden geladen …</p>
          <p v-else-if="catalogStatus === 'error'">
            Definitionen konnten nicht geladen werden.
            <button @click="loadDefinitions">Erneut versuchen</button>
          </p>
        </template>
      </div>
      <dl v-if="operatorRows?.length">
        <template v-for="(row, index) in operatorRows" :key="index">
          <dt>
            <strong>{{ row.title }}</strong> <span class="text-form">(<em>„{{ row.textForm }}“</em>)</span>
          </dt>
          <dd v-if="definitions">{{ row.definition ?? 'Definition nicht verfügbar' }}</dd>
        </template>
      </dl>
    </div>
    <slot />
  </section>
</template>

<style scoped>
.analysis-results {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: rgb(231, 228, 228);
  padding: 1rem 1rem calc(3.5vh + 24px);
}
[role='tablist'] {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #aaa;
}
[role='tab'] {
  padding: 0.5rem;
  color: inherit;
  font: inherit;
  background: transparent;
  border: 0;
  border-bottom: 3px solid transparent;
  cursor: pointer;
}
[aria-selected='true'] {
  border-bottom-color: #467a60;
  font-weight: bold;
}
[role='tabpanel'] {
  min-height: 0;
  overflow: auto;
}
dl,
p {
  margin: 0 0 0.75rem;
}
.text-form {
  color: #505050;
}
dd {
  margin: 0.25rem 0 0.75rem;
}
</style>
