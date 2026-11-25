// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

/** A language barrier found in the analysed text. */
export interface Barrier {
  start: number
  end: number
  barrier_number: string
  token: string
  title?: string
  description?: string
  suggestion?: string
}

/** Catalogue entry describing a kind of language barrier. */
export interface BarrierDefinition {
  title: string
  description: string
  suggestion: string
}

/** A technical term ("Fachwort") of a domain's vocabulary. */
export interface ParlanceWord {
  word: string
  pos_tag: string
}

/** Occurrence of a technical term in the analysed text. */
export interface ParlanceMatch {
  start: number
  end: number
  token: string
}

export interface TranslationRequest {
  text: string
  strategy: string
  barriers: Barrier[]
  parlance_words: string[]
}

export interface TranslationResult {
  title: string
  optimized: string
  strategy_used: string
}

export interface AnalysisResult {
  barriers?: Barrier[]
  parlance?: ParlanceMatch[]
}

export interface Feedback {
  ratings: Record<string, number>
  comment: string
  suggestion: string
}

export interface FeedbackRequest {
  text_original: string
  text_translated: string
  strategy: string
  feedback?: Feedback & {
    mode: 'translation' | 'barrier_analysis'
    barriers: string[]
  }
}

/** Surface token with Unicode code-point offsets [start, end) in the submitted text. */
export interface OperatorOccurrence {
  token: string
  start: number
  end: number
}

export interface OperatorDefinition {
  operator: string
  definition: string
}

export interface OperatorAnalysis {
  operators: string[]
  operators_lemmatized?: string[]
  occurrences?: OperatorOccurrence[]
}

interface OperatorMetric {
  score: number
  meta: {
    input_operators: string[]
    output_operators: string[]
    input_operators_lemmatized: string[]
    output_operators_lemmatized: string[]
    input_occurrences?: OperatorOccurrence[]
    output_occurrences?: OperatorOccurrence[]
  }
}

export interface ValidationResult {
  results: {
    operator_consistency_deterministic_with_order?: OperatorMetric
    operator_consistency_deterministic_without_order?: OperatorMetric
  }
}
