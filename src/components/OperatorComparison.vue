<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
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
  <div class="comparison" role="status" aria-label="Operatorenvergleich">
    <span v-if="status === 'loading'">Operatoren werden verglichen …</span>
    <span v-else-if="status === 'error'">Der Operatorenvergleich ist nicht verfügbar.</span>
    <template v-else-if="ordered && unordered">
      <span v-if="!ordered.meta.input_operators.length && !ordered.meta.output_operators.length">
        In beiden Texten wurden keine Operatoren gefunden.
      </span>
      <template v-else>
        <span class="comparison-title">Operatorenvergleich</span>
        <dl>
          <div>
            <dt>An gleicher Position</dt>
            <dd>{{ percent.format(ordered.score) }}</dd>
          </div>
          <div>
            <dt>Positionsunabhängig</dt>
            <dd>{{ percent.format(unordered.score) }}</dd>
          </div>
        </dl>
      </template>
    </template>
  </div>
</template>

<style scoped>
.comparison {
  min-width: 0;
  margin-inline-end: auto;
  color: #505050;
  font-size: 0.8125rem;
  line-height: 1.35;
}
.comparison-title {
  color: #3d4742;
  font-weight: 600;
}
dl {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1.25rem;
  margin: 0.25rem 0 0;
}
dl > div {
  display: flex;
  flex-direction: column-reverse;
}
dt {
  font-size: 0.75rem;
}
dd {
  margin: 0;
  color: #305942;
  font-size: 0.9375rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
</style>
