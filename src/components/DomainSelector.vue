<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { fetchDomains } from '@/api'

const selected = defineModel<string | null>({ required: true })
const domains = ref<string[]>([])
const loading = ref(false)

async function load() {
  if (loading.value || domains.value.length) return
  loading.value = true
  try {
    domains.value = await fetchDomains()
  } catch {
    // Retry when the selector receives focus.
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <select v-model="selected" class="domain-select" aria-label="Berufsfeld" @focus="load">
    <option value="">Berufsfeld wählen</option>
    <option v-if="selected && !domains.includes(selected)" :value="selected">{{ selected }}</option>
    <option v-for="domain in domains" :key="domain" :value="domain">{{ domain }}</option>
  </select>
</template>

<style scoped>
.domain-select {
  flex: 0 0 auto;
  max-width: 12rem;
  margin-inline-start: auto;
}
</style>
