<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, computed } from 'vue'

// Interface basierend auf deiner Struktur
interface Barrier {
  start: number
  end: number
  barrier_number: string
  title?: string
  description?: string
  suggestion?: string
}

const props = defineProps<{
  barriers: Barrier[]
}>()

// --- Logik für Eindeutigkeit ---
const uniqueBarriers = computed(() => {
  const seen = new Set()
  return props.barriers.filter((item) => {
    const duplicate = seen.has(item.barrier_number)
    seen.add(item.barrier_number)
    return !duplicate
  })
})

// --- State Management ---
// Nur noch ein Wert (string oder null), statt eines Arrays
const openSectionId = ref<string | null>(null)

const toggleSection = (id: string) => {
  // Wenn die geklickte ID schon offen ist, schließen wir sie (null)
  // Ansonsten setzen wir die neue ID (andere schließen sich dadurch automatisch)
  openSectionId.value = openSectionId.value === id ? null : id

  // Optional: Alle Unterpunkte schließen, wenn die Hauptbarriere gewechselt wird
  // openSubs.value = {};
}

// Prüfung ist jetzt ein einfacher Vergleich
const isOpen = (id: string) => openSectionId.value === id
</script>

<template>
  <div class="barrier-list">
    <div v-if="uniqueBarriers.length === 0" class="empty-state">
      <span>Keine Sprachbarrieren vorhanden. :)</span><br />
      <span
        >Wichtig: Die Sprachbarrieren "Wortkomposita" und "Wortklassenwechsel" werden von der
        Analyse nicht erkannt.</span
      >
    </div>

    <div v-for="barrier in uniqueBarriers" :key="barrier.barrier_number" class="barrier-item">
      <div @click="toggleSection(barrier.barrier_number)" class="header main-header">
        <span class="nr-badge">{{ barrier.barrier_number }} </span>
        <span class="title-text">{{ barrier.title || 'Kein Titel' }} </span>
        <span class="arrow">{{ isOpen(barrier.barrier_number) ? '▼' : '▶' }}</span>
      </div>

      <div v-if="isOpen(barrier.barrier_number)" class="sub-content">
        <div class="static-sub">
          <div class="sub-header-static">Beschreibung</div>
          <div class="detail-box">
            {{ barrier.description || 'Keine Beschreibung verfügbar.' }}
          </div>
        </div>

        <div class="static-sub">
          <div class="sub-header-static">Empfehlung</div>
          <div class="detail-box">
            {{ barrier.suggestion || 'Keine Empfehlung verfügbar.' }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.barrier-list {
  display: flex;
  flex-direction: column;
  gap: 8px;

  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 5px;
  width: 100%;
}

.main-header {
  display: flex;
  align-items: center;
  gap: 7px;

  padding: 10px;
  cursor: pointer;
  color: #589b7a; /* Deine Wunschfarbe */
}

.nr-badge {
  font-weight: bold;
  min-width: 30px; /* Verhindert, dass die Nummer bei einstelligen Werten springt */
}

.title-text {
  flex-grow: 1; /* Sorgt dafür, dass der Titel den Platz füllt und der Pfeil rechts bleibt */
  text-align: left;
}

.arrow {
  font-size: 0.8rem;
  /* Optionale Animation für den Pfeil */
  transition: transform 0.2s ease;
  padding-right: 50px;
}

sub-content {
  /* 35px (Badge) + 12px (Gap) = 47px Einrückung */
  /* Damit beginnt "Beschreibung" exakt auf der Linie des Titels */
  padding-left: 70px;
  margin-top: -5px; /* Zieht es etwas näher an den Header ran */
  padding-bottom: 15px;
}

.expandable-sub {
  margin-bottom: 4px;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  cursor: pointer;
  font-size: 1.1rem;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
}

/* Die Details (Beschreibungstext) nochmals minimal einrücken */
.detail-box {
  padding: 8px 0 8px 15px;
  font-size: 1.1rem;
  color: #555;
  line-height: 1.5;
  border-left: 2px solid #589b7a22; /* Hauchdünne Linie für bessere Optik */
}

.arrow {
  font-size: 0.7rem;
  transition: transform 0.2s ease;
}
.rotate {
  transform: rotate(90deg);
}
</style>
