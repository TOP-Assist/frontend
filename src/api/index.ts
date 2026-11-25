// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type {
  AnalysisResult,
  BarrierDefinition,
  FeedbackRequest,
  OperatorAnalysis,
  OperatorDefinition,
  ValidationResult,
  ParlanceWord,
  TranslationRequest,
  TranslationResult,
} from './types'

export type * from './types'

const BASE_URL = '/v1'

async function send(path: string, errorMessage: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    throw new Error(`${errorMessage} (status ${res.status})`)
  }
  return res
}

async function request<T>(path: string, errorMessage: string, init?: RequestInit): Promise<T> {
  const res = await send(path, errorMessage, init)
  return res.json()
}

function jsonBody(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

export function fetchDomains(): Promise<string[]> {
  return request('/parlance/domains', 'Fehler beim Abrufen der Berufsfelder')
}

/** The backend answers 404 if the domain has no parlance words. */
export function fetchParlanceWords(domain: string, minFreq: number): Promise<ParlanceWord[]> {
  const params = new URLSearchParams({ domain, min_freq: String(minFreq) })
  return request(`/parlance?${params}`, 'Parlance lookup failed')
}

export function fetchBarrierDefinitions(): Promise<BarrierDefinition[]> {
  return request('/analysis/barriers', 'Barrier lookup failed')
}

export function analyzeText(text: string, parlanceWords: ParlanceWord[]): Promise<AnalysisResult> {
  return request('/analysis', 'Analysis failed', jsonBody({ text, parlance_words: parlanceWords }))
}

export function fetchOperatorDefinitions(): Promise<OperatorDefinition[]> {
  return request('/analysis/operators', 'Operatorendefinitionen konnten nicht geladen werden')
}

export function analyzeOperators(input: string): Promise<OperatorAnalysis> {
  return request('/analysis/operators', 'Operatorenanalyse fehlgeschlagen', jsonBody({ input }))
}

export function validateTranslation(input: string, output: string): Promise<ValidationResult> {
  return request(
    '/validation',
    'Operatorenvergleich fehlgeschlagen',
    jsonBody({ input_text: input, output_text: output }),
  )
}

export function translateText(body: TranslationRequest): Promise<TranslationResult> {
  return request('/translation', 'Translation failed', jsonBody(body))
}

export async function submitFeedback(body: FeedbackRequest): Promise<void> {
  await send('/feedback', 'Storing feedback failed', jsonBody(body))
}
