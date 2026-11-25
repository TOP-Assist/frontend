// SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
// SPDX-FileCopyrightText: 2026 deepsight GmbH
// SPDX-License-Identifier: AGPL-3.0-or-later

import { operatorMatchLabels, type OperatorHighlight } from '@/operatorHighlights'
import katex from 'katex'
import { Marked, Renderer, type TokenizerAndRendererExtension } from 'marked'

const delimiters = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
]

function readMath(source: string) {
  const delimiter = delimiters.find(({ left }) => source.startsWith(left))
  if (!delimiter) return

  const { left, right, display } = delimiter
  let braceDepth = 0
  for (let index = left.length; index < source.length; index++) {
    if (braceDepth <= 0 && source.startsWith(right, index)) {
      return {
        raw: source.slice(0, index + right.length),
        latex: source.slice(left.length, index),
        display,
      }
    }
    const character = source[index]
    if (character === '\\') index++
    if (character === '{') braceDepth++
    if (character === '}') braceDepth--
  }
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function isWebUrl(href: string) {
  try {
    const { protocol } = new URL(href, 'https://example.invalid')
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

function mathExtension(level: 'block' | 'inline'): TokenizerAndRendererExtension {
  const name = level === 'block' ? 'displayMath' : 'inlineMath'
  return {
    name,
    level,
    start: level === 'inline' ? (source) => source.search(/\$|\\[\[(]/) : undefined,
    tokenizer(source) {
      const math = readMath(source)
      if (!math) return
      if (
        level === 'block' &&
        (!math.display || !/^[ \t]*(?:\n|$)/.test(source.slice(math.raw.length)))
      ) {
        return
      }

      return { type: name, ...math }
    },
    renderer({ raw, latex, display }) {
      try {
        return katex.renderToString(latex, { displayMode: display, trust: false, strict: 'ignore' })
      } catch {
        return escapeHtml(raw)
      }
    },
  }
}

const markdown = new Marked({
  breaks: true,
  extensions: [mathExtension('block'), mathExtension('inline')],
  renderer: {
    // The editor serializes underline as bare <u> tags. Escape other raw HTML.
    html: ({ raw }) => (/^<\/?u>$/i.test(raw) ? raw : escapeHtml(raw)),
    link(token) {
      if (!isWebUrl(token.href) && !/^mailto:/i.test(token.href)) {
        return this.parser.parseInline(token.tokens)
      }
      // Escape entities so the browser sees the same URL that passed validation.
      return Renderer.prototype.link.call(this, { ...token, href: escapeHtml(token.href) })
    },
    image(token) {
      if (!isWebUrl(token.href)) return escapeHtml(token.text)
      return Renderer.prototype.image.call(this, { ...token, href: escapeHtml(token.href) })
    },
  },
})

export function renderTranslationMarkdown(text: string) {
  return markdown.parse(text, { async: false })
}

// Project the rendered Markdown so validation and highlighting count the same Unicode
// characters. KaTeX emits multiple representations of each formula, so skip its subtree.
export function translationDocument(markdown: string, operators: OperatorHighlight[] = []) {
  const template = document.createElement('template')
  template.innerHTML = renderTranslationMarkdown(markdown)
  const characters: string[] = []
  const runs: { node: Text; start: number; end: number }[] = []

  function visit(node: Node) {
    if (node instanceof Text) {
      const start = characters.length
      for (const character of node.data) characters.push(character)
      runs.push({ node, start, end: characters.length })
    } else if (node instanceof Element && node.matches('.katex, .katex-display')) {
      characters.push(' ')
    } else if (node instanceof HTMLBRElement) {
      characters.push('\n')
    } else {
      node.childNodes.forEach(visit)
    }
  }
  visit(template.content)

  for (const run of runs) {
    const fragment = document.createDocumentFragment()
    let cursor = run.start
    for (const { start, end, token, match } of operators) {
      if (start >= run.end || end <= cursor || !match) continue
      if (characters.slice(start, end).join('') !== token) continue
      const from = Math.max(start, cursor)
      const to = Math.min(end, run.end)
      fragment.append(characters.slice(cursor, from).join(''))
      const mark = document.createElement('span')
      mark.className = 'operator-highlight'
      mark.dataset.match = match
      mark.title = operatorMatchLabels[match]
      mark.textContent = characters.slice(from, to).join('')
      fragment.append(mark)
      cursor = to
    }
    if (cursor > run.start) {
      fragment.append(characters.slice(cursor, run.end).join(''))
      run.node.replaceWith(fragment)
    }
  }
  return { text: characters.join(''), html: template.innerHTML }
}
