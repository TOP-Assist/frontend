// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
// SPDX-License-Identifier: AGPL-3.0-or-later

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'

interface TextSpan {
  start: number
  end: number
  token: string
}

const projections = new WeakMap<ProseMirrorNode, ReturnType<typeof projectText>>()

function projectText(doc: ProseMirrorNode) {
  const characters: string[] = []
  const positions: (number | undefined)[] = []
  const starts = new Map<number, number>()
  const ends = new Map<number, number>()

  const append = (text: string, pos?: number) => {
    // Python counts Unicode code points. ProseMirror positions count UTF-16 units.
    for (const character of text) {
      positions.push(pos)
      if (pos !== undefined) {
        starts.set(pos, characters.length)
        pos += character.length
        ends.set(pos, characters.length + 1)
      }
      characters.push(character)
    }
  }

  doc.descendants((node, pos, parent, index) => {
    if (parent === doc && index > 0) append('\n\n')
    if (node.text) append(node.text, pos)
    if (node.type.name === 'hardBreak') append('\n')
    if (node.type.name === 'inlineMath') append(' ')
  })

  return { text: characters.join(''), characters, positions, starts, ends }
}

export function editorText(doc: ProseMirrorNode) {
  let projection = projections.get(doc)
  if (!projection) {
    projection = projectText(doc)
    projections.set(doc, projection)
  }
  return projection
}

export function documentRange(doc: ProseMirrorNode, span: TextSpan) {
  const { positions, characters } = editorText(doc)
  if (span.start >= span.end || characters.slice(span.start, span.end).join('') !== span.token) {
    return null
  }
  const from = positions[span.start]
  const last = positions[span.end - 1]
  if (from === undefined || last === undefined) return null
  return { from, to: last + characters[span.end - 1]!.length }
}

export function analysisSpan(doc: ProseMirrorNode, from: number, to: number) {
  const { starts, ends, characters } = editorText(doc)
  const start = starts.get(from)
  const end = ends.get(to)
  if (start === undefined || end === undefined || start >= end) return null
  return { start, end, token: characters.slice(start, end).join('') }
}

export function remapSpans<T extends TextSpan>(
  spans: T[],
  transactions: Transaction[],
  doc: ProseMirrorNode,
) {
  return spans.flatMap((span) => {
    const range = documentRange(transactions[0]!.before, span)
    if (!range) return []

    let { from, to } = range
    for (const { mapping } of transactions) {
      const start = mapping.mapResult(from, 1)
      const end = mapping.mapResult(to, -1)
      if (start.deleted || end.deleted || start.pos >= end.pos) return []
      from = start.pos
      to = end.pos
    }

    const mapped = analysisSpan(doc, from, to)
    return mapped?.token === span.token ? [{ ...span, ...mapped }] : []
  })
}

export function remapSourceSpans<T extends TextSpan>(
  spans: T[],
  before: ProseMirrorNode,
  after: ProseMirrorNode,
) {
  const previous = editorText(before).characters
  const current = editorText(after).characters
  const sharedLength = Math.min(previous.length, current.length)

  // Source edits reparse the document, so map the unchanged prefix and suffix of its analysis text.
  let prefix = 0
  while (prefix < sharedLength && previous[prefix] === current[prefix]) prefix++
  let suffix = 0
  while (
    suffix < sharedLength - prefix &&
    previous[previous.length - 1 - suffix] === current[current.length - 1 - suffix]
  ) {
    suffix++
  }

  const offset = current.length - previous.length
  return spans.flatMap((span) => {
    if (!documentRange(before, span)) return []
    if (span.end <= prefix) return documentRange(after, span) ? [span] : []
    if (span.start < previous.length - suffix) return []
    const shifted = { ...span, start: span.start + offset, end: span.end + offset }
    return documentRange(after, shifted) ? [shifted] : []
  })
}
