<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="domain-selector" ref="domainSelectorRef">
    <div class="domain-selector__trigger" @click="toggleDropdown">
      <span class="domain-selector__label">Berufsfeld:</span>
      <span class="domain-selector__value">{{ selectedDomain || 'Wählen...' }}</span>
      <button
        v-if="selectedDomain"
        class="domain-selector__clear-btn"
        @click.stop="clearDomain"
        title="Domain löschen"
      >
        ✕
      </button>
      <svg class="domain-selector__icon" :class="{ 'domain-selector__icon--open': isOpen }">
        <use href="#icon-chevron"></use>
      </svg>
    </div>

    <transition name="dropdown-fade">
      <div v-if="isOpen" class="domain-selector__dropdown">
        <div class="domain-selector__search">
          <input
            v-model="searchInput"
            type="text"
            placeholder="Berufsfeld suchen..."
            class="domain-selector__input"
            @focus="handleInputFocus"
            @input="handleSearch"
            @keydown.escape="closeDropdown"
            @keydown.up="selectPrevious"
            @keydown.down="selectNext"
            @keydown.enter="selectOption"
            ref="searchInputRef"
          />
          <svg v-if="isLoading" class="domain-selector__spinner">
            <use href="#icon-spinner"></use>
          </svg>
        </div>

        <ul class="domain-selector__list">
          <li v-if="filteredDomains.length === 0 && !isLoading" class="domain-selector__empty">
            Keine Berufsfelder gefunden
          </li>
          <li
            v-for="(domain, index) in filteredDomains"
            :key="domain"
            class="domain-selector__option"
            :class="{ 'domain-selector__option--active': index === highlightedIndex }"
            @click="selectDomain(domain)"
            @mouseover="highlightedIndex = index"
          >
            {{ domain }}
          </li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { fetchDomains } from '@/api'

const allDomains = ref<string[]>([])
const searchInput = ref('')
const isOpen = ref(false)
const isLoading = ref(false)
const highlightedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)
const domainSelectorRef = ref<HTMLElement | null>(null)

const props = defineProps<{
  modelValue: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const selectedDomain = computed(() => props.modelValue)

// Gefilterte Domains basierend auf Sucheingabe
const filteredDomains = computed(() => {
  if (!searchInput.value.trim()) {
    return allDomains.value
  }
  const query = searchInput.value.toLowerCase()
  return allDomains.value.filter((domain) => domain.toLowerCase().includes(query))
})

const handleSearch = (event: Event) => {
  const input = (event.target as HTMLInputElement).value
  searchInput.value = input
  highlightedIndex.value = 0
}

const handleInputFocus = async () => {
  // Wenn das Input fokussiert wird und noch keine Domänen geladen sind
  if (filteredDomains.value.length === 0 && searchInput.value.length === 0) {
    await fetchAllDomains()
  }
}

const fetchAllDomains = async () => {
  isLoading.value = true
  try {
    allDomains.value = await fetchDomains()
    highlightedIndex.value = 0
  } catch (error) {
    console.error('Domain fetch error:', error)
    allDomains.value = []
  } finally {
    isLoading.value = false
  }
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      searchInputRef.value?.focus()
    })
  }
}

const closeDropdown = () => {
  isOpen.value = false
  searchInput.value = ''
}

const selectDomain = (domain: string) => {
  emit('update:modelValue', domain)
  closeDropdown()
}

const selectPrevious = () => {
  if (highlightedIndex.value > 0) {
    highlightedIndex.value--
  }
}

const selectNext = () => {
  if (highlightedIndex.value < filteredDomains.value.length - 1) {
    highlightedIndex.value++
  }
}

const selectOption = () => {
  if (filteredDomains.value.length > 0) {
    selectDomain(filteredDomains.value[highlightedIndex.value])
  }
}

const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (domainSelectorRef.value && !domainSelectorRef.value.contains(target)) {
    closeDropdown()
  }
}

const clearDomain = () => {
  emit('update:modelValue', '')
  closeDropdown()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.domain-selector-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 12px;
  width: 100%;
}

.domain-selector {
  position: relative;
  display: inline-block;
  min-width: 55%;
}

.domain-selector__trigger:hover {
  outline: 2px solid #589b79;
  outline-offset: 0;
}

.domain-selector__trigger:hover {
  border-color: #589b79;
  box-shadow: 0 2px 8px rgba(88, 155, 121, 0.15);
  outline: 2px solid rgba(88, 155, 121, 0.1);
}

.domain-selector__trigger:focus-visible {
  outline: 2px solid #467a60 !important;
}

.domain-selector__label {
  font-size: 1rem;
  color: #666;
  font-weight: 600;
}

.domain-selector__value {
  font-size: 1rem;
  color: #333;
  flex: 1;
  text-align: center;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.domain-selector__icon {
  width: 18px;
  height: 18px;
  transition: transform 0.3s ease;
  color: #589b79;
  flex-shrink: 0;
}

.domain-selector__icon--open {
  transform: rotate(180deg);
}

.domain-selector__dropdown {
  position: absolute;
  top: 100%;
  left: auto;
  right: 0;
  margin-top: 8px;
  background: #ffffff;
  border: 1px solid #ccc;
  border-radius: 15px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 100;
  max-height: 400px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 50%;
}

.domain-selector__search {
  position: relative;
  padding: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.domain-selector__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 10px;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s ease;
  font-family: inherit;
  background-color: #ffffff;
  color: #333;
}

.domain-selector__input::placeholder {
  color: #999;
}

.domain-selector__input:focus {
  border-color: #589b79;
  outline: 2px solid rgba(88, 155, 121, 0.2);
  box-shadow: 0 0 0 3px rgba(88, 155, 121, 0.1);
}

.domain-selector__spinner {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #589b79;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: translateY(-50%) rotate(0deg);
  }
  to {
    transform: translateY(-50%) rotate(360deg);
  }
}

.domain-selector__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.domain-selector__option {
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 1rem;
  color: #333;
}

.domain-selector__option:hover,
.domain-selector__option--active {
  background-color: rgba(88, 155, 121, 0.08);
  color: #589b79;
}

.domain-selector__option--active {
  background-color: rgba(88, 155, 121, 0.15);
  color: #467a60;
  font-weight: 600;
}

.domain-selector__empty {
  padding: 16px;
  text-align: center;
  color: #999;
  font-size: 1rem;
}

.domain-selector__clear-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #999;
  font-size: 1.2rem;
  padding: 0 8px;
  transition: color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}

.domain-selector__clear-btn:hover {
  color: #d32f2f;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
