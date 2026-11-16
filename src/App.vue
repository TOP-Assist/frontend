<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>

<template>
  <div class="body">
    <div class="container">
      <div class="section header-section">
        <AppHeader />
      </div>
      <div class="section main-section">
        <RouterView />
      </div>
      <div class="section footer-section">
        <AppFooter />
      </div>
    </div>
  </div>
</template>

<style scoped>
.body {
  margin: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: whitesmoke;
  color: black;
}

.container {
  display: grid;
  grid-template-rows: 18% 60% 22%;
  grid-template-columns: 100%;
  width: 80vw;
  height: 100vh;
  justify-content: center;
}
.section {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  width: 100%;
}

.header-section {
  color: rgba(0, 0, 0, 0.702);
  display: flex;
  justify-content: space-between;
  align-items: center; /* Align logo and brand name in the same row */
  padding: 0 0px;
  margin-top: -5px;
  height: 100%;
}
.main-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  width: 100%;
}

.footer-section {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  width: 100%;
}

/* Let the assistant grow with stacked editors and expanded results. */
.body:has(:deep(.assistant-workspace)),
.container:has(:deep(.assistant-workspace)) {
  min-height: 100vh;
  height: auto;
}

.container:has(:deep(.assistant-workspace)) {
  grid-template-rows: minmax(18vh, auto) minmax(60vh, auto) minmax(22vh, auto);
}

@media (max-width: 768px) {
  .main-section {
    flex-direction: column;
    gap: 80px;
  }
}
</style>
