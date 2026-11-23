// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Extension } from '@tiptap/core'
import { Plugin, Selection } from '@tiptap/pm/state'
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
        appendTransaction(transactions, _, { doc, schema, selection, tr }) {
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
            const displayMode = doubleDollarLatex !== undefined
            const latex = (doubleDollarLatex ?? singleDollarLatex ?? '').trim()
            if (!latex || (!displayMode && first !== last)) continue
            if (
              displayMode &&
              first !== last &&
              !blocks.slice(firstIndex, blockIndex + 1).every(({ paragraph }) => paragraph)
            ) {
              continue
            }

            try {
              katex.renderToString(latex, {
                trust: false,
                throwOnError: true,
                strict: 'ignore',
                displayMode,
              })
            } catch {
              continue
            }

            const type = displayMode ? schema.nodes.blockMath! : schema.nodes.inlineMath!
            const startsBlock = displayMode && first.paragraph && !first.text.slice(0, from).trim()
            const endsBlock = displayMode && last.paragraph && !last.text.slice(to).trim()
            const startPos = startsBlock ? first.pos : first.pos + 1 + from
            const endPos = endsBlock ? last.pos + last.text.length + 2 : last.pos + 1 + to
            tr.replaceWith(tr.mapping.map(startPos), tr.mapping.map(endPos), type.create({ latex }))

            if (displayMode && selection.empty && selection.from === last.pos + 1 + to) {
              // Continue typing after the math block instead of replacing the selected node.
              const after = tr.mapping.map(endPos)
              if (after === tr.doc.content.size) tr.insert(after, schema.nodes.paragraph!.create())
              const caret = Selection.findFrom(tr.doc.resolve(after), 1, true)
              if (caret) tr.setSelection(caret)
            }
          }

          return tr.docChanged ? tr : null
        },
      }),
    ]
  },
})
