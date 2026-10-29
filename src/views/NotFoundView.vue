<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="not-found-page">
    <h1>404 - Seite nicht gefunden</h1>
    <p>
      Entschuldigung, die Seite, die Sie aufrufen möchten, ist nicht verfügbar. Möglicherweise wurde
      sie verschoben oder entfernt.
    </p>
    <p>Bitte überprüfen Sie die URL oder kehren Sie zur Startseite zurück.</p>
    <RouterLink to="/"><u>Zurück zur Startseite</u></RouterLink>
  </div>
</template>

<style scoped>
.not-found-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  text-align: center;
  font-family: Arial, sans-serif;
}

h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

p {
  font-size: 1.2em;
  margin-bottom: 20px;
}
</style>
