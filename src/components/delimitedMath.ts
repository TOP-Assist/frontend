// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import katex from 'katex'

const nonText = '\uFFFC'
// Single-dollar math stays on one line and uses Markdown's whitespace and currency boundaries.
const formula =
  /(?<![\\$])(?:\$\$([^$\uFFFC]+?)(?<!\\)\$\$(?!\$)|\$(?![\s$])([^$\n\uFFFC]+?)(?<![\s\\])\$(?![$\d]))/g

export const DelimitedMath = Extension.create({
  name: 'delimitedMath',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _, { doc, schema, tr }) {
          if (!transactions.some(({ docChanged }) => docChanged)) return null
          if (!doc.textContent.includes('$')) return null

          // Keep text offsets alongside document positions, including across paragraphs.
          let text = ''
          const blocks: { pos: number; offset: number; text: string; paragraph: boolean }[] = []
          doc.forEach((node, pos, index) => {
            if (index) text += '\n'
            const content = node.isTextblock
              ? node.textBetween(0, node.content.size, '', (leaf) =>
                  leaf.type.name === 'hardBreak' ? '\n' : nonText,
                )
              : nonText
            blocks.push({
              pos,
              offset: text.length,
              text: content,
              paragraph: node.type.name === 'paragraph',
            })
            text += content
          })

          let blockIndex = 0
          for (const match of text.matchAll(formula)) {
            const [, doubleDollarLatex, singleDollarLatex] = match
            const start = match.index
            const end = start + match[0].length
            while (blocks[blockIndex + 1] && blocks[blockIndex + 1]!.offset <= start) blockIndex++
            const first = blocks[blockIndex]!
            const firstIndex = blockIndex
            while (blocks[blockIndex + 1] && blocks[blockIndex + 1]!.offset < end) blockIndex++
            const last = blocks[blockIndex]!
            const from = start - first.offset
            const to = end - last.offset
            const standalone =
              doubleDollarLatex !== undefined &&
              !first.text.slice(0, from).trim() &&
              !last.text.slice(to).trim() &&
              blocks.slice(firstIndex, blockIndex + 1).every(({ paragraph }) => paragraph)
            const latex = (doubleDollarLatex ?? singleDollarLatex ?? '').trim()
            if (!latex || (!standalone && (first !== last || latex.includes('\n')))) continue

            try {
              katex.renderToString(latex, {
                trust: false,
                throwOnError: true,
                strict: 'ignore',
                displayMode: standalone,
              })
            } catch {
              continue
            }

            const type = standalone ? schema.nodes.blockMath! : schema.nodes.inlineMath!
            const startPos = standalone ? first.pos : first.pos + 1 + from
            const endPos = standalone ? last.pos + last.text.length + 2 : last.pos + 1 + to
            tr.replaceWith(tr.mapping.map(startPos), tr.mapping.map(endPos), type.create({ latex }))
          }

          return tr.docChanged ? tr : null
        },
      }),
    ]
  },
})
