<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div class="editor" v-bind="$attrs" :class="{ readonly }" @click.self="focusEditor">
    <div v-if="editor && !readonly" class="formatting" role="group" aria-label="Textformatierung">
      <select aria-label="Absatzformat" :value="headingLevel" @change="setHeading">
        <option value="0">Normaler Text</option>
        <option v-for="level in headingLevels" :key="level" :value="level">H{{ level }}</option>
      </select>
      <button
        type="button"
        aria-label="Fett"
        :aria-pressed="editor.isActive('bold')"
        @mousedown.prevent
        @click="editor.chain().focus().toggleBold().run()"
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        aria-label="Kursiv"
        :aria-pressed="editor.isActive('italic')"
        @mousedown.prevent
        @click="editor.chain().focus().toggleItalic().run()"
      >
        <em>I</em>
      </button>
      <button
        type="button"
        aria-label="Unterstrichen"
        :aria-pressed="editor.isActive('underline')"
        @mousedown.prevent
        @click="editor.chain().focus().toggleUnderline().run()"
      >
        <u>U</u>
      </button>
      <button type="button" @mousedown.prevent @click="openFormulaFromSelection">LaTeX</button>
      <button type="button" disabled>Tabelle</button>
      <button type="button" disabled>Bild</button>
    </div>

    <EditorContent
      v-if="editor"
      :editor="editor"
      class="editor-content"
      @click="closeContextMenu"
      @dblclick="handleDoubleClick"
    />

    <div
      v-if="contextMenu"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @mouseleave="closeContextMenu"
    >
      <button
        type="button"
        class="context-menu-item"
        :class="{ remove: contextMenu.isExistingWord }"
        @click="toggleParlanceWord"
      >
        {{ contextMenu.isExistingWord ? 'Fachwort entfernen' : 'Fachwort hinzufügen' }}
      </button>
    </div>

    <dialog
      v-if="!readonly"
      ref="formulaDialog"
      class="formula-dialog"
      aria-label="LaTeX-Formel"
      @close="onFormulaDialogClose"
    >
      <form class="formula-form" @submit.prevent="saveFormula">
        <label v-if="formulaTarget?.kind === 'insert'">
          Darstellung
          <select v-model="formulaType">
            <option value="inlineMath" :disabled="!formulaTarget.canInsertInline">Im Text</option>
            <option value="blockMath">Eigene Zeile</option>
          </select>
        </label>
        <label>
          LaTeX-Formel
          <textarea v-model="latex" rows="4" autofocus @input="formulaError = ''"></textarea>
        </label>
        <p v-if="formulaError" class="formula-error" role="alert">{{ formulaError }}</p>
        <div class="formula-actions">
          <button type="button" @click="formulaDialog?.close()">Abbrechen</button>
          <button type="submit">
            {{ formulaTarget?.kind === 'edit' ? 'Speichern' : 'Einfügen' }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { BlockMath, InlineMath } from '@tiptap/extension-mathematics'
import { Markdown } from '@tiptap/markdown'
import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { Barrier, ParlanceMatch } from '@/api'
import { analysisSpan, documentRange, editorText, remapSpans } from './editorText'
import { DelimitedMath } from './delimitedMath'

import { operatorMatchLabels, type OperatorHighlight } from '@/operatorHighlights'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    modelValue?: string
    readonly?: boolean
    barriers?: Barrier[]
    highlightMode?: 'all' | 'barriers' | 'operators'
    operators?: OperatorHighlight[]
    placeholder?: string
    parlance_words?: ParlanceMatch[]
  }>(),
  {
    modelValue: '',
    readonly: false,
    barriers: () => [],
    highlightMode: 'all',
    operators: () => [],
    placeholder: '',
    parlance_words: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:analysisText': [value: string]
  'update:barriers': [value: Barrier[]]
  'update:parlance_words': [value: ParlanceMatch[]]
}>()

const contextMenu = ref<{
  x: number
  y: number
  word: ParlanceMatch
  isExistingWord: boolean
} | null>(null)

const headingLevels = [1, 2, 3] as const
const headingLevel = computed(
  () => headingLevels.find((level) => editor.value?.isActive('heading', { level })) ?? 0,
)

type FormulaType = 'inlineMath' | 'blockMath'
type FormulaTarget =
  | { kind: 'edit'; pos: number; doc: ProseMirrorNode }
  | {
      kind: 'insert'
      from: number
      to: number
      blockPos: number
      canInsertInline: boolean
      doc: ProseMirrorNode
    }

const formulaDialog = ref<HTMLDialogElement | null>(null)
const formulaTarget = shallowRef<FormulaTarget | null>(null)
const formulaType = ref<FormulaType>('inlineMath')
const latex = ref('')
const formulaError = ref('')
const katexOptions = { trust: false, throwOnError: true, strict: 'ignore' } as const

function textToHtml(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped
    .split('\n\n')
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

const annotations = Extension.create({
  name: 'taskAnnotations',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: ({ doc }) => {
            const barriersByRange = new Map<
              string,
              { from: number; to: number; numbers: string[] }
            >()
            for (const barrier of props.highlightMode === 'operators' ? [] : props.barriers) {
              const range = documentRange(doc, barrier)
              if (!range) continue
              const key = `${range.from}:${range.to}`
              const existing = barriersByRange.get(key)
              if (existing) existing.numbers.push(barrier.barrier_number)
              else barriersByRange.set(key, { ...range, numbers: [barrier.barrier_number] })
            }
            const decorations = [...barriersByRange.values()].map(({ from, to, numbers }) =>
              Decoration.inline(from, to, { class: 'barrier', 'data-barrier': numbers.join(',') }),
            )
            for (const word of props.highlightMode === 'all' ? props.parlance_words : []) {
              const range = documentRange(doc, word)
              if (range)
                decorations.push(
                  Decoration.inline(range.from, range.to, { class: 'parlance-word' }),
                )
            }
            if (props.highlightMode !== 'barriers') {
              for (const operator of props.operators) {
                const range = documentRange(doc, operator)
                if (!range) continue
                const attrs = operator.match
                  ? {
                      class: 'operator-highlight',
                      'data-match': operator.match,
                      title: operatorMatchLabels[operator.match],
                    }
                  : { class: 'operator-highlight' }
                decorations.push(Decoration.inline(range.from, range.to, attrs))
              }
            }
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

let lastValue = props.modelValue

const editor = useEditor({
  content: props.readonly ? textToHtml(lastValue) : lastValue,
  contentType: props.readonly ? 'html' : 'markdown',
  editable: !props.readonly,
  extensions: [
    StarterKit.configure({
      undoRedo: false,
      bold: props.readonly ? false : {},
      italic: props.readonly ? false : {},
      underline: props.readonly ? false : {},
      heading: props.readonly ? false : { levels: [...headingLevels] },
      strike: false,
      code: false,
      codeBlock: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
      emptyEditorClass: 'is-editor-empty',
      showOnlyWhenEditable: false,
    }),
    ...(!props.readonly
      ? [
          Markdown,
          InlineMath.extend({ addInputRules: () => [] }).configure({
            onClick: editFormula,
            katexOptions,
          }),
          BlockMath.configure({
            onClick: editFormula,
            katexOptions: { ...katexOptions, displayMode: true },
          }),
          DelimitedMath,
          annotations,
        ]
      : []),
  ],
  onCreate: ({ editor }) => {
    if (!props.readonly) emit('update:analysisText', editorText(editor.state.doc).text)
  },
  onUpdate: ({ editor, transaction, appendedTransactions }) => {
    if (props.readonly) return

    const { doc } = editor.state
    const transactions = [transaction, ...appendedTransactions]
    lastValue = editor.isEmpty ? '' : editor.getMarkdown()
    closeContextMenu()
    emit('update:modelValue', lastValue)
    emit('update:analysisText', editorText(doc).text)
    if (props.barriers.length)
      emit('update:barriers', remapSpans(props.barriers, transactions, doc))
    if (props.parlance_words.length) {
      emit('update:parlance_words', remapSpans(props.parlance_words, transactions, doc))
    }
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value || value === lastValue) return
    lastValue = value
    editor.value.commands.setContent(props.readonly ? textToHtml(value) : value, {
      contentType: props.readonly ? 'html' : 'markdown',
      emitUpdate: false,
    })
    closeContextMenu()
    if (!props.readonly) emit('update:analysisText', editorText(editor.value.state.doc).text)
  },
)

watch(
  () => props.readonly,
  (value) => {
    if (!editor.value) return
    editor.value.setEditable(!value)
  },
)

watch(
  [
    () => props.highlightMode,
    () => props.barriers,
    () => props.parlance_words,
    () => props.operators,
  ],
  () => {
    if (!editor.value) return
    editor.value.view.dispatch(editor.value.state.tr)
  },
  { deep: true },
)

function setHeading(event: Event) {
  if (!editor.value) return
  const value = Number((event.target as HTMLSelectElement).value)
  const level = headingLevels.find((level) => level === value)
  const chain = editor.value.chain().focus()
  if (level) chain.setHeading({ level }).run()
  else chain.setParagraph().run()
}

function openFormulaFromSelection() {
  if (!editor.value) return
  const { doc, selection } = editor.value.state
  if (
    selection instanceof NodeSelection &&
    ['inlineMath', 'blockMath'].includes(selection.node.type.name)
  ) {
    editFormula(selection.node, selection.from)
    return
  }

  const { from, to, $from, $to } = selection
  const canInsertInline =
    selection instanceof TextSelection && $from.sameParent($to) && $from.parent.isTextblock
  const blockPos = $from.depth ? $from.after(1) : from
  showFormulaDialog(
    { kind: 'insert', doc, from, to, blockPos, canInsertInline },
    canInsertInline ? 'inlineMath' : 'blockMath',
    '',
  )
}

function editFormula(node: ProseMirrorNode, pos: number) {
  if (!editor.value || props.readonly) return
  showFormulaDialog(
    { kind: 'edit', doc: editor.value.state.doc, pos },
    node.type.name === 'blockMath' ? 'blockMath' : 'inlineMath',
    node.attrs.latex,
  )
}

function showFormulaDialog(target: FormulaTarget, type: FormulaType, source: string) {
  closeContextMenu()
  formulaTarget.value = target
  formulaType.value = type
  latex.value = source
  formulaError.value = ''
  formulaDialog.value?.showModal()
}

function saveFormula() {
  const instance = editor.value
  const target = formulaTarget.value
  if (!instance || !target) return
  if (target.doc !== instance.state.doc) {
    formulaError.value = 'Der Text wurde geändert. Öffnen Sie den Formeldialog erneut.'
    return
  }

  const source = latex.value.trim()
  const type = formulaType.value
  if (!source) {
    formulaError.value = 'Geben Sie eine LaTeX-Formel ein.'
    return
  }
  if (source.includes('$')) {
    formulaError.value =
      'Geben Sie die Formel ohne Dollarzeichen ein. Verwenden Sie \\char"24 für das Währungssymbol.'
    return
  }
  if (type === 'inlineMath' && source.includes('\n')) {
    formulaError.value = 'Geben Sie die Formel einzeilig ein oder wählen Sie „Eigene Zeile“.'
    return
  }
  try {
    katex.renderToString(source, { ...katexOptions, displayMode: type === 'blockMath' })
  } catch (error) {
    formulaError.value =
      error instanceof Error ? error.message : 'Die Formel konnte nicht gelesen werden.'
    return
  }

  const { commands } = instance
  const node = { type, attrs: { latex: source } }
  let saved: boolean
  if (target.kind === 'edit') {
    saved =
      type === 'inlineMath'
        ? commands.updateInlineMath({ latex: source, pos: target.pos })
        : commands.updateBlockMath({ latex: source, pos: target.pos })
  } else if (type === 'inlineMath') {
    saved = commands.insertContentAt({ from: target.from, to: target.to }, node)
  } else {
    const pos = instance.isEmpty ? { from: 0, to: target.doc.content.size } : target.blockPos
    saved = commands.insertContentAt(pos, node)
  }

  if (saved) formulaDialog.value?.close()
  else formulaError.value = 'Die Formel konnte an dieser Stelle nicht eingefügt werden.'
}

function onFormulaDialogClose() {
  formulaTarget.value = null
  editor.value?.commands.focus()
}

function focusEditor() {
  closeContextMenu()
  if (!props.readonly) editor.value?.commands.focus()
}

function handleDoubleClick(event: MouseEvent) {
  if (props.readonly || !editor.value) return
  const { state, view } = editor.value
  const selection = view.dom.ownerDocument.getSelection()
  if (!selection?.rangeCount || selection.isCollapsed) return

  // The browser selects the word before ProseMirror receives selectionchange.
  const range = selection.getRangeAt(0)
  if (!view.dom.contains(range.startContainer) || !view.dom.contains(range.endContainer)) return
  const from = view.posAtDOM(range.startContainer, range.startOffset)
  const to = view.posAtDOM(range.endContainer, range.endOffset)
  const selected = analysisSpan(state.doc, from, to)
  const token = selected?.token.trim()
  if (!selected || !token) return

  const start =
    selected.start + Array.from(selected.token.slice(0, selected.token.indexOf(token))).length
  const end = start + Array.from(token).length
  const existing = props.parlance_words.some((word) => word.start === start && word.end === end)
  contextMenu.value = {
    x: event.clientX,
    y: event.clientY,
    word: { start, end, token },
    isExistingWord: existing,
  }
}

function toggleParlanceWord() {
  if (!contextMenu.value) return
  const { word, isExistingWord } = contextMenu.value
  const words = isExistingWord
    ? props.parlance_words.filter((match) => match.start !== word.start || match.end !== word.end)
    : [...props.parlance_words, word]
  emit('update:parlance_words', words)
  closeContextMenu()
}

function closeContextMenu() {
  contextMenu.value = null
}
</script>

<style scoped>
.editor {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
}

.editor-content {
  min-height: 100%;
}

.editor:not(.readonly) {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor:not(.readonly) .editor-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.formatting {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0.25rem 0 0.5rem;
  margin-bottom: 0.4rem;
  border-bottom: 1px solid #ddd;
}

.formatting button,
.formatting select,
.formula-actions button {
  padding: 0.25rem 0.5rem;
  border: 1px solid #aaa;
  border-radius: 0.3rem;
  background: #fff;
  color: #222;
  font: inherit;
  font-size: 0.875rem;
}

.formatting button[aria-pressed='true'],
.formula-actions button[type='submit'] {
  border-color: #467a60;
  background: #deeee6;
}

.formatting button:disabled {
  border-color: #ddd;
  background: #f5f5f5;
  color: #777;
}

.formula-dialog {
  box-sizing: border-box;
  width: min(26rem, 90vw);
  padding: 1rem;
  border: 1px solid #aaa;
  border-radius: 0.6rem;
}

.formula-form,
.formula-form label {
  display: grid;
  gap: 0.4rem;
}

.formula-form {
  gap: 0.75rem;
}

.formula-form textarea {
  resize: vertical;
  font-family: monospace;
}

.formula-error {
  overflow-wrap: anywhere;
  color: #a32222;
  margin: 0;
}

.formula-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

:deep(.tiptap-mathematics-render--editable) {
  cursor: pointer;
}

:deep([data-type='block-math']) {
  overflow-x: auto;
}

.editor.readonly {
  cursor: default;
}

:deep(.ProseMirror) {
  outline: none;
  white-space: pre-wrap;
  min-height: 100%;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  color: #999;
  pointer-events: none;
  user-select: none;
  float: left;
  height: 0;
}

:deep(.barrier) {
  text-decoration: underline;
  text-decoration-color: #589b7a;
  text-underline-offset: 3px;
  text-decoration-thickness: 3px;
  position: relative;
}

:deep(.barrier::after) {
  content: attr(data-barrier);
  font-size: 0.7em;
  vertical-align: super;
  margin-left: 2px;
  color: #589b7a;
  pointer-events: none;
}

:deep(.parlance-word) {
  font-weight: bold;
  position: relative;
}

:deep(.parlance-word::before) {
  content: 'Fachwort';
  position: absolute;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 0.75em;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 10;
  font-weight: normal;
}

:deep(.parlance-word:hover::before) {
  opacity: 1;
}

:deep(.context-menu) {
  position: fixed;
  background: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 200px;
  overflow: hidden;
}

:deep(.context-menu-item) {
  display: block;
  width: 100%;
  padding: 10px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  font-size: 0.95rem;
  transition: background-color 0.2s;
  color: #333;
}

:deep(.context-menu-item:hover) {
  background-color: #f5f5f5;
}

:deep(.context-menu-item.remove:hover) {
  background-color: #ffe0e0;
  color: #d32f2f;
}
</style>
