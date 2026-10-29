<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  text: String,
  is_visible: Boolean,
  is_translate_model: Boolean,
})

const emit = defineEmits(['update-text', 'give-feedback', 'close'])

const feedback_translate = reactive<Record<string, number>>({
  'Allgemeine Qualität der Optimierung': 0,
  'Reduktion der sprachlichen Komplexität': 0,
  'Übernahme von Fachwörtern': 0,
  'Informationsstruktur und Gliederung': 0,
})

const feedback_barrier = reactive<Record<string, number>>({
  'Sinnvolle Ergänzung zur Textoptimierung': 0,
  'Übersichtlichkeit der Analyse': 0,
  'Verständlichkeit der Erläuterungen': 0,
  'Hilfreich für eigene zukünftige Texte': 0,
})

const feedback = computed<Record<string, number>>(
  () =>
    (props.is_translate_model ? feedback_translate : feedback_barrier) as Record<string, number>,
)

const suggestion = ref(props.text || '')
const comment = ref('')

function give_feedback() {
  emit('give-feedback', {
    ratings: { ...feedback.value },
    comment: comment.value,
    suggestion: suggestion.value,
  })
  emit('close')
}

function handle_cancel() {
  emit('close')
}

const isModified = computed(() => {
  // Check if any rating was changed
  const ratingChanged = Object.keys(feedback.value).some((key) => feedback.value[key] !== 0)

  // Check if any text was entered
  const textChanged = suggestion.value.trim() !== props.text?.trim() || comment.value.trim() !== ''

  return ratingChanged || textChanged
})
</script>

<template>
  <div v-if="is_visible" class="review-box" role="form" aria-labelledby="review-heading">
    <!-- <b v-if="is_translate_model">Optimierung:</b> <br>
    <div v-if="is_translate_model" class="text-display">{{ text }}</div> -->
    <p id="review-heading">
      <strong v-if="is_translate_model">Ihre Bewertung zu dieser Optimierung:</strong>
      <strong v-else>Ihre Bewertung zu dieser Analyse:</strong>
      <span class="tooltip-text">
        <p>Bewertung:</p>
        <p>1 Stern: sehr negativ</p>
        <p>2 Sterne: negativ</p>
        <p>3 Sterne: neutral</p>
        <p>4 Sterne: positiv</p>
        <p>5 Sterne: sehr positiv</p>
      </span>
    </p>
    <div v-for="(value, key) in feedback" :key="key" class="feedback-group">
      <label>{{ key }}</label>
      <div class="stars" role="radiogroup" :aria-label="`Bewerte ${key}`">
        <span
          v-for="star in 5"
          :key="star"
          class="star"
          :class="{ active: star <= feedback[key] }"
          :aria-label="`${star} Stern${star > 1 ? 'e' : ''}`"
          :aria-checked="feedback[key] === star"
          role="radio"
          tabindex="0"
          @click="feedback[key] = star"
          @keydown.enter.prevent="feedback[key] = star"
        >
          ★
        </span>
      </div>
    </div>

    <label for="anmerkungen" style="margin-top: 20px"
      ><p id="review-heading"><strong>Anmerkungen:</strong></p></label
    ><br />
    <textarea
      class="modal-textarea"
      id="anmerkungen"
      v-model="comment"
      placeholder="Zusätzliche Anmerkungen..."
      aria-label="Zusätzliche Anmerkungen"
    ></textarea>

    <div class="buttons">
      <button class="modal-btn" :disabled="!isModified" @click="give_feedback">Abschicken</button>
      <button class="modal-btn" @click="handle_cancel">Abbrechen</button>
    </div>
  </div>
</template>

<style>
* {
  font-family: Helvetica, Arial, sans-serif;
}
p {
  font-size: 1.1rem;
}
.buttons {
  display: flex;
  justify-content: center;
  bottom: 20px;
  right: 20px;
}

.review-box {
  border-radius: 20px;
  padding: 10px;
  /* max-width: 50%; */
  width: 100%;
  height: 100%;
  overflow-y: auto; /* Adds vertical scrollbar if needed */
  max-height: 80vh;
  text-align: center;
  /*padding: 20px;*/
  background-color: white;
  border: 2px solid #ccc;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}

.review-box::-webkit-scrollbar {
  display: none;
}

#review-heading {
  color: #222;
  font-size: 1.2rem;
  margin-bottom: 10px;
}

.feedback-group {
  font-size: 1.1rem;
}

.modal-textarea {
  width: 80%;
  height: 10vh;
  font-size: 1.1rem;
  padding: 15px;
  border-radius: 10px;
  background-color: #fff;
  color: #222;
  border: 2px solid #ccc;
}

.modal-btn {
  margin: 10px;
  padding: 10px;
  width: 25%;
  min-width: 200px;
  font-size: 1.1rem; /* minimal 18px requirement : 1.1rem*/
  font-weight: bold;
  border: none;
  border-radius: 20px;
  background-color: #589b79; /* background - text contrast : 6.38 */
  color: #000000;
  cursor: pointer;
  transition:
    background-color 0.3s,
    opacity 0.9s;
}

.modal-btn:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: default;
  opacity: 0.6;
}
.modal-btn:not(:disabled):hover {
  background-color: rgb(231, 228, 228);
  opacity: 0.9;
  border: 2px solid grey;
  margin-top: 6px;
}

.text-display {
  max-height: 200px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: #f9f9f9;
  margin-bottom: 20px;
  text-align: left;
  word-wrap: break-word;
}

.text-display::-webkit-scrollbar {
  width: 8px;
}

.text-display::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 5px;
}

.text-display::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 5px;
}

.text-display::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
