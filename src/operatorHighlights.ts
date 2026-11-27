// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { OperatorOccurrence } from '@/api'

export const operatorMatchLabels = {
  same: 'Grün · Gleiche Stelle in der Operatorenreihenfolge beider Texte.',
  moved: 'Gelb · Andere Stelle in der Operatorenreihenfolge des anderen Textes.',
  unmatched: 'Rot · Keine Entsprechung im anderen Text.',
}

type OperatorMatch = keyof typeof operatorMatchLabels
export type OperatorHighlight = OperatorOccurrence & {
  match?: OperatorMatch
  counterpart?: number
  lemma?: string
}

/** Compare positions in the operator sequence, using the backend's normalized lemmas. */
export function compareOperatorPositions(
  occurrences: OperatorOccurrence[] | undefined,
  operators: string[],
  otherOperators: string[],
): OperatorHighlight[] {
  if (!occurrences || occurrences.length !== operators.length) return []

  // Reserve exact matches first. Each remaining occurrence can pair only once.
  const available = new Map<string, number[]>()
  for (let index = otherOperators.length - 1; index >= 0; index--) {
    const lemma = otherOperators[index]!
    if (operators[index] === lemma) continue
    if (!available.has(lemma)) available.set(lemma, [])
    available.get(lemma)!.push(index)
  }

  return occurrences.map((occurrence, index) => {
    const lemma = operators[index]!
    const same = otherOperators[index] === lemma
    const counterpart = same ? index : available.get(lemma)?.pop()
    const match = same ? 'same' : counterpart === undefined ? 'unmatched' : 'moved'
    return { ...occurrence, lemma, match, counterpart }
  })
}
