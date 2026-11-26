<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DOMPurify from 'dompurify'

import { fetchDescription } from '@/api'

const router = useRouter()
const description_html = ref<string | null>(null)

/** Retrieve and sanitize the current landing-page description. */
async function get_description() {
  try {
    const description = await fetchDescription()

    description_html.value = DOMPurify.sanitize(description.text_html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3',
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's',
        'ul', 'ol', 'li', 'a',
        'blockquote', 'hr', 'pre', 'code',
      ],
      ALLOWED_ATTR: ['href', 'start'],
    })
  } catch (error) {
    console.warn('Description could not be loaded:', error)
  }
}

function goToTopAssist() {
  router.push({ name: 'assistant' })
}

onMounted(get_description)
</script>

<template>
  <div class="landing-page">
    <!-- Description provided by the admin backend. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div
      v-if="description_html !== null"
      class="scrollable-content"
      v-html="description_html"
    ></div>

    <!-- Fallback if the description is unavailable. -->
    <div v-else class="scrollable-content">
      <h1>Herzlich Willkommen bei TOP Assist</h1>

      <p>
        Dieses Werkzeug wurde im Projekt TOP.KI entwickelt. Mit Hilfe Künstlicher Intelligenz
        erleichtert TOP Assist die Erstellung von Prüfungsfragen in gut verständlicher Sprache.
      </p>

      <p>
        TOP Assist befindet sich gerade in der Erprobungsphase und wir würden uns freuen, wenn Sie
        es testen.
      </p>

      <p>
        Bisher legt TOP Assist einen Schwerpunkt auf die Textoptimierung von Prüfungsaufgaben und
        wurde mit Daten aus den Bereichen Druck-, Medien-, Metall-, Elektroindustrie sowie
        Wirtschafts- und Sozialkunde trainiert. Die Trainingsdaten werden aber kontinuierlich
        erweitert.
      </p>

      <p>
        Da sich TOP Assist noch in der Entwicklung befindet, kann es hin und wieder passieren,
        dass das Werkzeug nicht immer optimal funktioniert und erreichbar ist oder unterschiedliche
        Optimierungsvorschläge angezeigt werden, auch wenn mehrere Testpersonen denselben Text
        eingeben.
      </p>

      <h3 class="orange-heading">Starten Sie die Erprobung:</h3>

      <p>Schreiben Sie eine Prüfungsaufgabe in das linke Feld.</p>

      <p>Anschließend haben Sie zwei Optionen:</p>

      <ol>
        <li>
          <p class="highlight">Optimieren</p>
          <p>
            Klicken Sie den Button „Optimieren“, erscheint nach kurzer Zeit ein
            Textoptimierungsvorschlag im rechten Feld. Über eine Bewertung des Vorschlags mit
            Sternen würden wir uns sehr freuen <br />
            (ein Stern = sehr negativ, fünf Sterne = sehr positiv). <br />
            Bewerten Sie den Textoptimierungsvorschlag von TOP Assist mit
            <img class="icon-btn-img" src="@/assets/icons/rate.png" alt="Rate" />
          </p>
        </li>

        <li>
          <p class="highlight">Analysieren</p>
          <p>
            Klicken Sie den Button „Analysieren“, werden in dem von Ihnen eingegebenen Text
            Sprachbarrieren markiert und im rechten Feld genauer erklärt.
          </p>
        </li>
      </ol>

      <h3 class="orange-heading">
        Vielen Dank, dass Sie den Prototypen von TOP Assist erproben und bewerten!
      </h3>

      <p>
        Brauchen Sie Unterstützung vom Projektteam? Kontaktieren Sie
        <a href="mailto:kontakt@top-ki.info"><u>uns</u></a>
        gern.
      </p>
    </div>

    <button class="cta-button" @click="goToTopAssist">Zu TOP Assist</button>
  </div>
</template>

<style scoped>
.landing-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 15px;
  font-family: Arial, sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
}

.scrollable-content :deep(h1) {
  font-size: 2em;
  margin-bottom: 5px;
}

.scrollable-content :deep(h3) {
  font-size: 1.5em;
  margin-top: 10px;
}

.scrollable-content :deep(p),
.scrollable-content :deep(li) {
  font-size: 1em;
  margin-bottom: 5px;
}

.scrollable-content :deep(ul) {
  list-style-type: square;
  padding-left: 20px;
}

.scrollable-content :deep(ol) {
  padding-left: 20px;
}

.scrollable-content :deep(a) {
  text-decoration: underline;
}

.icon-btn-img {
  width: 3vh;
  height: 3vh;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 50%;
  padding: 5px;
}

.cta-button {
  margin-top: 10px;
  margin-left: 10%;
  padding: 10px;
  width: 80%;
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

.cta-button:hover {
  background-color: rgb(231, 228, 228);
  opacity: 0.9;
  border: 2px solid grey;
  margin-top: 6px;
}

.highlight {
  font-weight: bold;
}
</style>