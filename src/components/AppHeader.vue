<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="logo-brand">
    <img src="@/assets/logos/top-assist.png" alt="Brand Logo" class="brand-logo" />
    <div class="brand-name">
      <span class="top-line"><RouterLink to="/">TOP Assist</RouterLink></span>
      <span class="bottom-line">Textoptimierungs-Assistent für Prüfungsaufgaben</span>
    </div>
  </div>
</template>

<style scoped>
.logo-brand {
  display: flex;
  align-items: center; /* Align logo and brand name at the same height */
}

.brand-logo {
  width: 60px; /* Increase logo size for better alignment with brand name */
  height: auto;
  margin-right: 15px; /* Space between logo and brand name */
}

.brand-name {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.top-line {
  font-size: 1.5rem; /* Font size for the top line */
  font-weight: bold;
}

.bottom-line {
  font-size: 1.1rem; /* Font size for the bottom line */
  font-weight: normal;
  opacity: 0.7;
}

a {
  text-decoration: none;
}

a,
a:visited,
a:hover,
a:active {
  color: inherit;
}
/* Adjust layout for medium screens */
@media (max-width: 900px) {
  .top-line {
    font-size: 1.3rem;
  }
  .bottom-line {
    display: none;
  }
  .brand-name {
    margin-left: -10%;
  }
}
@media (max-width: 768px) {
  .brand-name {
    display: none;
  }
}
</style>
