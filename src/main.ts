// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/theme.css'

const app = createApp(App)

app.use(router)

app.mount('#app')
