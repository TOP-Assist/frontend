<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import { operatorMatchLabels } from '@/operatorHighlights'
import type { ValidationResult } from '@/api'

const props = defineProps<{
  status: 'loading' | 'ready' | 'error'
  results?: ValidationResult['results']
}>()

const ordered = computed(() => props.results?.operator_consistency_deterministic_with_order)
const unordered = computed(() => props.results?.operator_consistency_deterministic_without_order)
const percent = new Intl.NumberFormat('de-DE', { style: 'percent', maximumFractionDigits: 1 })
</script>

<template>
  <details open class="comparison">
    <summary>Operatorenvergleich</summary>
    <div role="status">
      <p v-if="status === 'loading'">Operatoren werden verglichen …</p>
      <p v-else-if="status === 'error'">Der Operatorenvergleich ist nicht verfügbar.</p>
      <template v-else-if="ordered && unordered">
        <p v-if="!ordered.meta.input_operators.length && !ordered.meta.output_operators.length">
          In beiden Texten wurden keine Operatoren gefunden.
        </p>
        <template v-else>
          <ul
            v-if="ordered.meta.input_occurrences?.length || ordered.meta.output_occurrences?.length"
            class="match-legend"
            aria-label="Farbmarkierungen im Text"
          >
            <li
              v-for="(label, match) in operatorMatchLabels"
              :key="match"
              class="operator-highlight"
              :data-match="match"
            >
              {{ label }}
            </li>
          </ul>
          <dl>
            <dt>An gleicher Position</dt>
            <dd>{{ percent.format(ordered.score) }}</dd>
            <dt>Unabhängig von der Position</dt>
            <dd>{{ percent.format(unordered.score) }}</dd>
          </dl>
        </template>
      </template>
    </div>
  </details>
</template>

<style scoped>
.comparison {
  margin-top: 0.75rem;
  background: white;
  padding: 0.75rem 1rem;
  border-radius: var(--panel-radius);
  font-size: 1rem;
}
summary {
  cursor: pointer;
  font-weight: bold;
}
.match-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  list-style: none;
  padding: 0;
}
.match-legend li {
  padding: 0.15em 0.4em;
}
dl {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
}
dd {
  margin: 0;
  font-weight: bold;
  text-align: right;
}
p {
  margin-bottom: 0;
}
</style>
