<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<script setup lang="ts">
import zfaLogo from '@/assets/logos/ZFA.png'
import iftoLogo from '@/assets/logos/IFTO.png'
import obbLogo from '@/assets/logos/OBB.png'
import buwLogo from '@/assets/logos/BUW.png'
import deepsightLogo from '@/assets/logos/deepsight.png'
import bbwLogo from '@/assets/logos/BBW.png'
import bmasLogo from '@/assets/logos/BMAS.png'

const currentYear = new Date().getFullYear()

const logos = [
  { src: zfaLogo, url: 'https://zfamedien.de/', alt: 'ZFA-Medien' },
  { src: iftoLogo, url: 'https://www.ifto.de/', alt: 'IFTO' },
  { src: obbLogo, url: 'https://oberlin-berufsbildung.de/', alt: 'OBB' },
  { src: buwLogo, url: 'https://www.uni-wuppertal.de', alt: 'BUW' },
  { src: deepsightLogo, url: 'https://deepsight.de/', alt: 'Deep Sight' },
  { src: bbwLogo, url: 'https://www.berufsbildungswerk-leipzig.de/', alt: 'BBW Leipzig' },
  { src: bmasLogo, url: 'https://www.bmas.de/DE/Startseite/start.html', alt: 'BMAS' },
]
</script>

<template>
  <div class="logo-container">
    <a
      v-for="(logo, index) in logos"
      :key="index"
      :href="logo.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      <img :src="logo.src" :alt="logo.alt" />
    </a>
  </div>
  <div class="footer-link-container">
    <p class="footer-link">
      <a href="https://www.tmdt.uni-wuppertal.de/">
        &copy; Institute for Technologies and Management of Digital Transformation {{ currentYear }}. All Rights
        Reserved.
      </a>
      <RouterLink to="/impressum"><u>Impressum</u></RouterLink>
    </p>
  </div>
</template>

<style scoped>
.logo-container {
  display: flex;
  width: 80%;
  justify-content: space-around;
  align-items: center;
  padding: 10px 5%;
}

.logo-container img {
  width: 80%; /* Ensuring equal size distribution */
  max-width: 120px;
  height: auto;
  transition:
    transform 0.3s ease-in-out,
    opacity 0.3s;
}

.logo-container img:hover {
  transform: scale(1.1);
  opacity: 0.8;
}

/* Container for the footer link */
.footer-link-container {
  width: 100%;
  text-align: center;
  margin-top: 10px; /* Space between the logo container and the footer link */
}

.footer-link {
  font-size: 0.9rem;
  color: #555;
}

.footer-link a {
  text-decoration: none;
  color: grey; /* Link color */
  font-weight: light;
}
</style>
