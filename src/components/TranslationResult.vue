<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import 'katex/dist/katex.min.css'

defineProps<{ html: string }>()
</script>

<template>
  <div class="translation-result" v-html="html"></div>
</template>

<style scoped>
.translation-result {
  overflow: auto;
  overflow-wrap: anywhere;
}

.translation-result > :deep(:first-child) {
  margin-top: 0;
}

.translation-result > :deep(:last-child) {
  margin-bottom: 0;
}

.translation-result :deep(pre) {
  white-space: pre-wrap;
}
</style>
