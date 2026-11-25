// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { OperatorOccurrence } from '@/api'

export const operatorMatchLabels = {
  same: 'Gleiche Position',
  moved: 'Andere Position',
  unmatched: 'Keine Entsprechung',
}

type OperatorMatch = keyof typeof operatorMatchLabels
export type OperatorHighlight = OperatorOccurrence & { match?: OperatorMatch }

/** Compare positions in the operator sequence, using the backend's normalized lemmas. */
export function compareOperatorPositions(
  occurrences: OperatorOccurrence[] | undefined,
  operators: string[],
  otherOperators: string[],
): OperatorHighlight[] {
  if (!occurrences || occurrences.length !== operators.length) return []

  // Reserve exact matches first. Each remaining occurrence can pair only once.
  const available = new Map<string, number>()
  otherOperators.forEach((lemma, index) => {
    if (operators[index] !== lemma) available.set(lemma, (available.get(lemma) ?? 0) + 1)
  })

  return occurrences.map((occurrence, index) => {
    const lemma = operators[index]!
    if (otherOperators[index] === lemma) return { ...occurrence, match: 'same' }
    const remaining = available.get(lemma) ?? 0
    if (!remaining) return { ...occurrence, match: 'unmatched' }
    available.set(lemma, remaining - 1)
    return { ...occurrence, match: 'moved' }
  })
}
