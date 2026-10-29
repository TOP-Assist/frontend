<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

function goToTopAssist() {
  router.push({ name: 'assistant' })
}
</script>

<template>
  <div class="landing-page">
    <div class="scrollable-content">
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
        Da sich TOP Assist noch in der Entwicklung befindet, kann es hin und wieder passieren, dass
        das Werkzeug nicht immer optimal funktioniert und erreichbar ist oder unterschiedliche
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
  overflow-y: auto; /* only this part scrolls */
  padding-right: 10px; /* optional, for scrollbar spacing */
}

h1 {
  font-size: 2em;
  margin-bottom: 5px;
}

h3 {
  font-size: 1.5em;
  margin-top: 10px;
}

p,
li {
  font-size: 1em;
  margin-bottom: 5px;
}

ul {
  list-style-type: disc;
  padding-left: 20px;
}

ol {
  padding-left: 20px;
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
  align-self: flex-end center;
}
.cta-button:hover {
  background-color: rgb(231, 228, 228);
  opacity: 0.9;
  border: 2px solid grey;
  margin-top: 6px;
}

ul {
  list-style-type: square;
}
.highlight {
  font-weight: bold;
}
</style>
