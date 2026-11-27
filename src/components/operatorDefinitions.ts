// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { ref } from 'vue'
import { fetchOperatorDefinitions, type OperatorDefinition } from '@/api'

export const definitions = ref<Map<string, OperatorDefinition>>()
export const catalogStatus = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
export async function loadDefinitions() {
  if (catalogStatus.value === 'loading' || definitions.value) return
  catalogStatus.value = 'loading'
  try {
    const entries = await fetchOperatorDefinitions()
    definitions.value = new Map(entries.map((entry) => [entry.operator.toLowerCase(), entry]))
    catalogStatus.value = 'ready'
  } catch {
    catalogStatus.value = 'error'
  }
}
