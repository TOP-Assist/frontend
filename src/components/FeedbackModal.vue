<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

import {
  fetchFeedbackCategories,
  submitFeedback,
  type FeedbackCategoriesVersion,
  type FeedbackDraft,
} from '@/api'

const props = defineProps<{
  draft: FeedbackDraft
}>()

const emit = defineEmits<{
  close: []
}>()

const config = ref<FeedbackCategoriesVersion | null>(null)
const feedback = ref<Record<string, number>>({})
const comment = ref('')

const loading = ref(false)
const submitting = ref(false)
const error = ref('')

const is_translate_model = computed(() => props.draft.mode === 'translation')

const isModified = computed(
  () =>
    Object.values(feedback.value).some((rating) => rating !== 0) ||
    comment.value.trim() !== '',
)

/** Retrieve the latest feedback categories for the selected mode. */
async function get_feedback_categories() {
  loading.value = true
  error.value = ''

  try {
    config.value = await fetchFeedbackCategories(props.draft.mode)

    feedback.value = Object.fromEntries(
      config.value.categories.map((category) => [category, 0]),
    )
  } catch {
    error.value = 'Die Bewertungskategorien konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

/** Store feedback with the category version displayed to the user. */
async function give_feedback() {
  if (!config.value || submitting.value || !isModified.value) {
    return
  }

  submitting.value = true
  error.value = ''

  const { mode, ...context } = props.draft

  try {
    await submitFeedback({
      ...context,
      categories_version: config.value.version,
      feedback: {
        mode,
        ratings: { ...feedback.value },
        comment: comment.value,
        suggestion: context.text_translated ?? '',
      },
    })

    emit('close')
  } catch {
    error.value = 'Das Feedback konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.'
  } finally {
    submitting.value = false
  }
}

onMounted(get_feedback_categories)
</script>

<template>
  <div class="review-box" role="form" aria-labelledby="review-heading">
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

    <p v-if="loading">Bewertungskategorien werden geladen …</p>

    <template v-if="config">
      <div
        v-for="category in config.categories"
        :key="category"
        class="feedback-group"
      >
        <label>{{ category }}</label>

        <div class="stars" role="radiogroup" :aria-label="`Bewerte ${category}`">
          <button
            v-for="star in 5"
            :key="star"
            type="button"
            class="star"
            :class="{ active: star <= (feedback[category] ?? 0) }"
            :aria-label="`${star} Stern${star > 1 ? 'e' : ''}`"
            :aria-checked="feedback[category] === star"
            :disabled="submitting"
            role="radio"
            @click="feedback[category] = star"
          >
            ★
          </button>
        </div>
      </div>

      <label for="anmerkungen" class="comment-label">
        <strong>Anmerkungen:</strong>
      </label>

      <textarea
        id="anmerkungen"
        v-model="comment"
        class="modal-textarea"
        placeholder="Zusätzliche Anmerkungen..."
        aria-label="Zusätzliche Anmerkungen"
        :disabled="submitting"
      ></textarea>
    </template>

    <p v-if="error" class="feedback-error" role="alert">
      {{ error }}
    </p>

    <div class="buttons">
      <button
        v-if="config"
        class="modal-btn"
        :disabled="!isModified || submitting"
        @click="give_feedback"
      >
        {{ submitting ? 'Wird gespeichert …' : 'Abschicken' }}
      </button>

      <button
        v-else-if="!loading"
        class="modal-btn"
        @click="get_feedback_categories"
      >
        Erneut laden
      </button>

      <button
        class="modal-btn"
        :disabled="submitting"
        @click="emit('close')"
      >
        Abbrechen
      </button>
    </div>
  </div>
</template>

<style scoped>
p {
  font-size: 1.1rem;
}

.buttons {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
}

.review-box {
  border-radius: 20px;
  padding: 10px;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  max-height: 80vh;
  text-align: center;
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

.star {
  border: none;
  padding: 0;
}

.star:disabled {
  cursor: default;
}

.comment-label {
  display: block;
  margin-top: 20px;
  margin-bottom: 10px;
  font-size: 1.2rem;
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
  font-size: 1.1rem;
  font-weight: bold;
  border: none;
  border-radius: 20px;
  background-color: #589b79;
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

.feedback-error {
  color: #a12727;
}
</style>