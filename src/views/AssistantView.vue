<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

import {
  analyzeText,
  fetchBarrierDefinitions,
  fetchParlanceWords,
  translateText,
  type Barrier,
  type BarrierDefinition,
  type FeedbackDraft,
  type ParlanceMatch,
  type ParlanceWord,
} from '@/api'

import FeedbackModal from '@/components/FeedbackModal.vue'
import RichTextarea from '@/components/RichTextarea.vue'
import BarrierInfo from '@/components/BarrierInfo.vue'
import DomainSelector from '@/components/DomainSelector.vue'
import QueueOverlay from '@/components/QueueOverlay.vue'

const src_text = ref<string>('')
const src_text_cached = ref<string>('')
const target_text = ref('')
const translation_mode = ref(true)

const selectedDomain = ref<string | null>(
  localStorage.getItem('selectedDomain') || null,
)

localStorage.setItem('selectedDomain', selectedDomain.value || '')

watch(selectedDomain, (val) => {
  localStorage.setItem('selectedDomain', val || '')
})

const wait_res = ref(false)
const score_src = ref(' ')
const score_target = ref(' ')

const feedback_draft = ref<FeedbackDraft | null>(null)

const show_barrier_lexikon_modal = ref(false)
const strategy = ref('default')
const all_barriers = ref<BarrierDefinition[]>([])
const barriers = ref<Barrier[]>([])
const all_parlance_words = ref<ParlanceWord[]>([])
const parlance_words = ref<ParlanceMatch[]>([])

const parlance_treshold = ref(
  parseInt(localStorage.getItem('parlance_treshold') ?? '') || 270,
)

localStorage.setItem('parlance_treshold', String(parlance_treshold.value))

watch(parlance_treshold, (val) => {
  localStorage.setItem('parlance_treshold', String(val))
})

const tooltip_disabled = ref(false)

watch(
  selectedDomain,
  () => {
    get_parlance_words()
  },
  { immediate: true },
)

onMounted(() => {
  get_all_barriers()
})

function reset_values() {
  src_text.value = ''
  src_text_cached.value = ''
  target_text.value = ''
  score_src.value = ' '
  score_target.value = ' '
  barriers.value = []
}

async function translate() {
  if (!src_text.value.trim() || src_text.value === src_text_cached.value) {
    return
  }

  target_text.value = ''
  wait_res.value = true

  try {
    const result = await translateText({
      text: src_text.value,
      strategy: strategy.value,
      barriers: barriers.value,
      parlance_words: parlance_words.value.map((word) => word.token),
    })

    target_text.value = `${result.title}\n\n${result.optimized}`
    strategy.value = result.strategy_used

    src_text_cached.value = src_text.value
  } catch {
    target_text.value = 'Ups! Etwas ist schiefgelaufen. Bitte versuchen Sie es später erneut.'
  } finally {
    wait_res.value = false
  }
}

async function analize_src() {
  if (src_text.value) {
    wait_res.value = true

    try {
      const answer = await analyzeText(src_text.value, all_parlance_words.value)

      barriers.value = answer.barriers ?? []
      parlance_words.value = answer.parlance ?? []
    } catch (error) {
      console.error('API Fehler:', error)
    }
  } else {
    barriers.value = []
  }

  wait_res.value = false
}

async function get_parlance_words() {
  if (!selectedDomain.value) {
    all_parlance_words.value = []
    return
  }

  try {
    all_parlance_words.value = await fetchParlanceWords(
      selectedDomain.value,
      parlance_treshold.value,
    )
  } catch {
    all_parlance_words.value = []
  }
}

async function get_all_barriers() {
  try {
    all_barriers.value = await fetchBarrierDefinitions()
  } catch {
    all_barriers.value = []
  }
}

const copy_success_message = ref(false)

function copy_to_clipboard() {
  navigator.clipboard.writeText(target_text.value)

  copy_success_message.value = true

  setTimeout(() => {
    copy_success_message.value = false
  }, 1500)
}

// Click handlers: each action also hides the button's tooltip.

function on_reset() {
  reset_values()
  tooltip_disabled.value = true
}

function on_translate() {
  translate()
  translation_mode.value = true
}

function on_analyze() {
  analize_src()
  translation_mode.value = false
  tooltip_disabled.value = true
}

/** Capture the current feedback context and open the feedback modal. */
function open_feedback_modal() {
  if (wait_res.value || feedback_draft.value) {
    return
  }

  feedback_draft.value = {
    text_original: translation_mode.value
      ? src_text_cached.value || src_text.value
      : src_text.value,

    text_translated: translation_mode.value
      ? target_text.value
      : null,

    strategy: strategy.value,

    mode: translation_mode.value
      ? 'translation'
      : 'barrier_analysis',

    barriers: translation_mode.value
      ? []
      : barriers.value
          .map((barrier) => barrier.title)
          .filter((title): title is string => !!title),
  }

  tooltip_disabled.value = true
}

function on_copy() {
  copy_to_clipboard()
  tooltip_disabled.value = true
}
</script>

<template>
  <!-- Left side: Text field and Optimieren button -->
  <div class="content-box">
    <div class="domain-selector-container">
      <DomainSelector v-model="selectedDomain" />
    </div>

    <div class="textarea-container">
      <RichTextarea
        class="textarea"
        v-model="src_text"
        v-model:barriers="barriers"
        v-model:parlance_words="parlance_words"
        placeholder="Prüfungsaufgabe hier eingeben oder einfügen"
      />

      <button
        v-if="src_text"
        id="delete-btn"
        class="icon-btn delete-btn"
        @click="on_reset"
        @mouseleave="tooltip_disabled = false"
        @focus="tooltip_disabled = false"
        @blur="tooltip_disabled = false"
      >
        <img src="@/assets/icons/delete.png" alt="Delete" />

        <span v-if="!tooltip_disabled" class="tooltip-text">
          Den Text löschen!
        </span>
      </button>
    </div>

    <div class="btns-container">
      <button
        class="optimieren-btn"
        @click="on_translate"
        :disabled="!src_text"
      >
        Optimieren
      </button>

      <button
        class="optimieren-btn barriere"
        @click="on_analyze"
        @mouseleave="tooltip_disabled = false"
        @focus="tooltip_disabled = false"
        @blur="tooltip_disabled = false"
        :disabled="!src_text"
      >
        Analysieren

        <span v-if="!tooltip_disabled" class="tooltip-text">
          Analysiere den Text auf Sprachbarrieren.
        </span>
      </button>
    </div>
  </div>

  <!-- Right side: Translated text and icons -->
  <div v-if="translation_mode" class="content-box right-box">
    <RichTextarea
      id="right-box"
      class="textarea"
      v-model="target_text"
      readonly
    />

    <div v-if="wait_res" class="skeleton">
      <div class="skeleton-text shimmer"></div>
      <div class="skeleton-text shimmer"></div>
      <div class="skeleton-text shimmer"></div>
      <div class="skeleton-text shimmer"></div>
      <div class="skeleton-text short shimmer"></div>

      <QueueOverlay
        :wait-res="wait_res"
        :delay-ms="8000"
        theme="light"
        :closable="false"
        :close-on-backdrop="false"
      />
    </div>

    <div class="icons">
      <button
        v-if="target_text"
        class="icon-btn"
        :disabled="wait_res || feedback_draft !== null"
        @click="open_feedback_modal"
        @mouseleave="tooltip_disabled = false"
        @focus="tooltip_disabled = false"
        @blur="tooltip_disabled = false"
      >
        <img src="@/assets/icons/rate.png" alt="Rate" />

        <span v-if="!tooltip_disabled" class="tooltip-text">
          Bewerten Sie das Ergebnis.
        </span>
      </button>

      <button
        v-if="target_text"
        class="icon-btn"
        @click="on_copy"
        @mouseleave="tooltip_disabled = false"
        @focus="tooltip_disabled = false"
        @blur="tooltip_disabled = false"
      >
        <img src="@/assets/icons/copy.png" alt="Copy" />

        <span v-if="!tooltip_disabled" class="tooltip-text">
          Kopieren Sie das Ergebnis.
        </span>

        <span v-if="copy_success_message" class="tooltip-text">
          Erfolgreich kopiert!
        </span>
      </button>
    </div>
  </div>

  <!-- Right side: Barrier analysis -->
  <div v-else class="content-box right-box">
    <BarrierInfo
      id="right-box"
      class="textarea"
      :barriers="barriers"
    />

    <div class="icons">
      <button
        class="icon-btn"
        :disabled="wait_res || feedback_draft !== null"
        @click="open_feedback_modal"
        @mouseleave="tooltip_disabled = false"
        @focus="tooltip_disabled = false"
        @blur="tooltip_disabled = false"
      >
        <img src="@/assets/icons/rate.png" alt="Rate" />

        <span v-if="!tooltip_disabled" class="tooltip-text">
          Bewerten Sie die Analyse.
        </span>
      </button>
    </div>
  </div>

  <!-- Feedback modal -->
  <transition name="fade">
    <div
      v-if="feedback_draft"
      class="feedback-modal"
      style="position: absolute; top: 70px; left: 30px; z-index: 999"
    >
      <FeedbackModal
        :draft="feedback_draft"
        @close="feedback_draft = null"
      />
    </div>
  </transition>

  <!-- Barrier lexicon modal -->
  <transition name="fade">
    <div
      v-if="show_barrier_lexikon_modal"
      class="barrier-lexikon-modal"
    >
      <div
        class="modal-overlay"
        @click="show_barrier_lexikon_modal = false"
      ></div>

      <div class="modal-content">
        <div class="modal-header">
          <h2>Barriere-Lexikon</h2>

          <button
            class="close-btn"
            @click="show_barrier_lexikon_modal = false"
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <div v-if="all_barriers.length === 0" class="no-barriers">
            Keine Barrieren verfügbar.
          </div>

          <div v-else class="barriers-list">
            <div
              v-for="(barrier, index) in all_barriers"
              :key="index"
              class="barrier-item"
            >
              <h3 class="barrier-title">{{ barrier.title }}</h3>
              <p class="barrier-description">{{ barrier.description }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style>
.feedback-modal {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 99;
  display: flex;
  width: 45%;
  min-width: 500px;
  height: auto;
}

.content-box {
  display: flex;
  flex-direction: column;
  width: 49%;
  border-radius: 5px;
}

.textarea-container {
  position: relative;
  width: 100%;
}

.domain-selector-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  width: 100%;
}

.domain-selector__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.domain-selector__trigger:hover {
  border-color: #b0b0b0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.domain-selector__dropdown {
  position: absolute;
  top: 100%;
  left: auto;
  right: 0;
  margin-top: 4px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  z-index: 100;
  max-height: 300px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#delete-btn {
  position: absolute;
  top: 15px;
  right: 15px;
  width: 2vh;
  height: 2vh;
  background-color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 5px;
  box-shadow: none;
}

#delete-btn img {
  width: 15px;
  height: 15px;
}

#delete-btn:hover {
  transform: scale(1.1);
}

.textarea {
  width: 100%;
  min-height: 350px;
  max-height: 350px;
  padding: 1vh 4vh 1vh 1vh;
  font-size: 1.1rem;
  background-color: white;
  letter-spacing: normal;
  font-variant-ligatures: none;
  tab-size: 2;
  border-radius: 15px;
  box-sizing: border-box;
  resize: none !important;
}

.textarea:focus,
textarea:hover {
  outline: 2px solid #589b79;
  outline-offset: 0;
}

.btns-container {
  display: flex;
  gap: 20px;
  justify-content: flex-end;
}

.optimieren-btn {
  margin-top: 10px;
  padding: 10px;
  width: 35%;
  font-size: 1.1rem;
  font-weight: bold;
  border-radius: 20px;
  background-color: #589b79;
  color: #000000;
  cursor: pointer;
  transition:
    background-color 0.3s,
    opacity 0.9s;
  border: 2px solid transparent;
}

.optimieren-btn:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: default;
  opacity: 0.6;
}

.optimieren-btn:not(:disabled):hover {
  background-color: rgb(231, 228, 228);
  opacity: 0.9;
  border: 2px solid grey;
  transform: translateY(-1px);
}

.right-box {
  margin-top: -10px;
  position: relative;
}

#right-box {
  background-color: rgb(231, 228, 228);
  border: none;
}

#right-box:focus {
  border: none;
  outline: none;
}

.skeleton {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 8px;
  box-sizing: border-box;
  pointer-events: none;
  border-radius: 4px;
  z-index: 2;
}

.skeleton-text {
  background-color: #c6c6c6;
  border-radius: 4px;
  margin-bottom: 12px;
  padding: 2px;
  position: relative;
  overflow: hidden;
  width: 90%;
  height: 18px;
}

.skeleton-text.short {
  width: 60%;
}

.shimmer::before {
  content: '';
  position: absolute;
  top: 0;
  left: -150px;
  width: 150px;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shimmer 1.2s infinite;
}

@keyframes shimmer {
  100% {
    transform: translateX(300px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.barrier-lexikon-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f0f0f0;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.barriers-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.barrier-item {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.barrier-item:hover {
  border-color: #589b7a;
  box-shadow: 0 2px 4px rgba(88, 155, 122, 0.1);
}

.barrier-title {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #589b7a;
  font-weight: 600;
}

.barrier-description {
  margin: 0;
  color: #555;
  line-height: 1.5;
}

.no-barriers {
  text-align: center;
  color: #999;
  padding: 40px 20px;
  font-size: 1.1rem;
}
</style>