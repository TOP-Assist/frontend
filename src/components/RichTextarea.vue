<!--
SPDX-FileCopyrightText: 2026 Bergische Universität Wuppertal
SPDX-FileCopyrightText: 2026 deepsight GmbH

SPDX-License-Identifier: AGPL-3.0-or-later
-->

<template>
  <div
    class="editor"
    v-bind="$attrs"
    :class="{ readonly }"
    @click="focusEditor"
    @dblclick="handleDoubleClick"
  >
    <EditorContent v-if="editor" :editor="editor" class="editor-content" />

    <!-- Kontextmenü -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @mouseleave="closeContextMenu"
    >
      <button v-if="!contextMenu.isExistingWord" class="context-menu-item" @click="addParlanceWord">
        Fachwort hinzufügen
      </button>
      <button
        v-if="contextMenu.isExistingWord"
        class="context-menu-item remove"
        @click="removeParlanceWord"
      >
        Fachwort entfernen
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch, ref, nextTick } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Extension } from '@tiptap/core'
import { Plugin } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Barrier, ParlanceMatch } from '@/api'

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
  'update:barriers': [value: Barrier[]]
  'update:parlance_words': [value: ParlanceMatch[]]
}>()

const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  selectedWord: ParlanceMatch | null
  isExistingWord: boolean
}>({
  visible: false,
  x: 0,
  y: 0,
  selectedWord: null,
  isExistingWord: false,
})

const isSettingContent = { value: false }
const lastText = { value: props.modelValue || '' }

const textToHtml = (text: string) => {
  const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  return escapedText
    .split('\n\n')
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('')
}

// Count newlines before a given position in the text
const countNewlinesBefore = (text: string, position: number) => {
  let count = 0
  for (let i = 0; i < Math.min(position, text.length); i++) {
    if (text[i] === '\n') {
      count++
    }
  }
  return count
}

const groupedBarriers = computed(() => {
  const text = props.modelValue || ''
  const grouped = new Map<string, { start: number; end: number; numbers: string[] }>()

  for (const barrier of props.barriers) {
    // Adjust positions by subtracting the number of newlines before them
    const newlinesBeforeStart = countNewlinesBefore(text, barrier.start)
    const newlinesBeforeEnd = countNewlinesBefore(text, barrier.end)

    const adjustedStart = barrier.start - newlinesBeforeStart
    const adjustedEnd = barrier.end - newlinesBeforeEnd

    const key = `${adjustedStart}:${adjustedEnd}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        start: adjustedStart,
        end: adjustedEnd,
        numbers: [barrier.barrier_number],
      })
    } else {
      grouped.get(key)!.numbers.push(barrier.barrier_number)
    }
  }
  return Array.from(grouped.values())
})

const groupedParlanceWords = computed(() => {
  const text = props.modelValue || ''
  const grouped = new Map<string, ParlanceMatch>()

  for (const word of props.parlance_words) {
    const newlinesBeforeStart = countNewlinesBefore(text, word.start)
    const newlinesBeforeEnd = countNewlinesBefore(text, word.end)

    const adjustedStart = word.start - newlinesBeforeStart
    const adjustedEnd = word.end - newlinesBeforeEnd

    const key = `${adjustedStart}:${adjustedEnd}`
    if (!grouped.has(key)) {
      grouped.set(key, {
        start: adjustedStart,
        end: adjustedEnd,
        token: word.token,
      })
    }
  }
  return Array.from(grouped.values())
})

const mapIndexToPos = (doc: ProseMirrorNode, index: number) => {
  let textIndex = 0
  let found: number | null = null

  doc.descendants((node, pos) => {
    if (found !== null) return false

    if (node.isText) {
      const len = node.text?.length ?? 0
      if (textIndex + len > index) {
        found = pos + (index - textIndex)
        return false
      }
      textIndex += len
    }

    return true
  })

  return found ?? doc.content.size
}

const barrierHighlight = Extension.create({
  name: 'barrierHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            if (props.highlightMode === 'operators' || !groupedBarriers.value.length) return null

            const decorations = groupedBarriers.value
              .map((barrier) => {
                const from = mapIndexToPos(state.doc, barrier.start)
                const to = mapIndexToPos(state.doc, barrier.end)
                if (from >= to) return null
                return Decoration.inline(from, to, {
                  class: 'barrier',
                  'data-barrier': barrier.numbers.join(','),
                })
              })
              .filter((decoration) => decoration !== null)

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

const parlanceWordHighlight = Extension.create({
  name: 'parlanceWordHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations: (state) => {
            if (props.highlightMode !== 'all' || !groupedParlanceWords.value.length) return null

            const decorations = groupedParlanceWords.value
              .map((word) => {
                const from = mapIndexToPos(state.doc, word.start)
                const to = mapIndexToPos(state.doc, word.end)
                if (from >= to) return null
                return Decoration.inline(from, to, {
                  class: 'parlance-word',
                  'data-token': word.token,
                })
              })
              .filter((decoration) => decoration !== null)

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

const operatorHighlight = Extension.create({
  name: 'operatorHighlight',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          decorations({ doc }) {
            if (props.highlightMode === 'barriers' || !props.operators.length) return null

            // Our plain-text editor represents a hard break as one newline and a
            // paragraph boundary as two. Both occupy the same width in the document.
            // Text starts at position 1 and ProseMirror counts UTF-16 code units.
            const positions = [1]
            let position = 1
            for (const character of props.modelValue) {
              position += character.length
              positions.push(position)
            }

            const marks = []
            for (const { start, end, token, match } of props.operators) {
              const from = positions[start]
              const to = positions[end]
              if (from === undefined || to === undefined || from >= to || to > doc.content.size)
                continue
              if (doc.textBetween(from, to) === token) {
                const attributes = match
                  ? {
                      class: 'operator-highlight',
                      'data-match': match,
                      title: operatorMatchLabels[match],
                    }
                  : { class: 'operator-highlight' }
                marks.push(Decoration.inline(from, to, attributes))
              }
            }
            return DecorationSet.create(doc, marks)
          },
        },
      }),
    ]
  },
})

const editor = useEditor({
  content: textToHtml(props.modelValue || ''),
  parseOptions: { preserveWhitespace: 'full' },
  editable: !props.readonly,
  extensions: [
    StarterKit.configure({
      undoRedo: false,
      bold: false,
      italic: false,
      strike: false,
      code: false,
      codeBlock: false,
      heading: false,
      blockquote: false,
      horizontalRule: false,
      bulletList: false,
      orderedList: false,
      listItem: false,
    }),
    Placeholder.configure({
      placeholder: props.placeholder || '',
      emptyEditorClass: 'is-editor-empty',
      showOnlyWhenEditable: false,
    }),
    barrierHighlight,
    parlanceWordHighlight,
    operatorHighlight,
  ],
  onUpdate: ({ editor }) => {
    if (props.readonly || isSettingContent.value) return

    const text = editor.getText()
    const caret = Math.max(editor.state.selection.from - 1, 0)
    const delta = text.length - lastText.value.length

    const newBarriers = props.barriers
      .map((barrier) => {
        if (caret > barrier.start && caret <= barrier.end) {
          // Caret inside barrier → delete it
          return null
        } else if (caret <= barrier.start) {
          // Caret before barrier → move it
          const newStart = barrier.start + delta
          const newEnd = barrier.end + delta
          // If barrier goes beyond text length, delete it
          if (newStart < 0 || newEnd < 0 || newStart >= text.length) {
            return null
          }
          return {
            ...barrier,
            start: newStart,
            end: newEnd,
          }
        } else {
          // Caret after barrier → check if barrier still valid
          if (barrier.end > text.length) {
            return null
          }
          return barrier
        }
      })
      .filter((barrier) => barrier !== null)

    const newParlanceWords = props.parlance_words
      .map((word) => {
        if (caret > word.start && caret <= word.end) {
          return null
        } else if (caret <= word.start) {
          const newStart = word.start + delta
          const newEnd = word.end + delta
          if (newStart < 0 || newEnd < 0 || newStart >= text.length) {
            return null
          }
          return {
            ...word,
            start: newStart,
            end: newEnd,
          }
        } else {
          if (word.end > text.length) {
            return null
          }
          return word
        }
      })
      .filter((word) => word !== null)

    lastText.value = text
    emit('update:modelValue', text)
    emit('update:barriers', newBarriers)
    emit('update:parlance_words', newParlanceWords)
  },
})

watch(
  () => props.modelValue,
  (value) => {
    if (!editor.value) return
    const text = value || ''
    if (editor.value.getText() === text) return
    isSettingContent.value = true
    const htmlContent = textToHtml(text)
    editor.value.commands.setContent(htmlContent, {
      emitUpdate: false,
      parseOptions: { preserveWhitespace: 'full' },
    })
    lastText.value = text
    isSettingContent.value = false
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

const focusEditor = () => {
  contextMenu.value.visible = false
  if (!editor.value || props.readonly) return
  editor.value.commands.focus()
}

const handleDoubleClick = async (e: MouseEvent) => {
  if (props.readonly) return

  // Warte bis ProseMirror den Doppelklick verarbeitet hat
  await nextTick()

  if (!editor.value) return

  const { from, to } = editor.value.state.selection
  const selectedText = editor.value.state.doc.textBetween(from, to)

  if (!selectedText.trim()) return

  // Konvertiere ProseMirror Positionen zu Text Indizes
  let textIndex = 0
  let textFrom = 0
  let textTo = 0
  let isConvertingFrom = true

  editor.value.state.doc.descendants((node, nodePos) => {
    if (node.isText) {
      const nodeLen = node.text?.length ?? 0

      if (isConvertingFrom && nodePos + nodeLen > from) {
        textFrom = textIndex + (from - nodePos)
        isConvertingFrom = false
      }

      if (nodePos + nodeLen >= to && textTo === 0) {
        textTo = textIndex + (to - nodePos)
      }

      textIndex += nodeLen
    }
  })

  // Suche ob ein existierendes Word bei dieser Position ist (mit Toleranz)
  const existingWord = props.parlance_words.find((word) => {
    // Toleranzbereich von ±2 für Position-Unterschiede
    return Math.abs(word.start - textFrom) <= 2 && Math.abs(word.end - textTo) <= 2
  })

  contextMenu.value = {
    visible: true,
    x: e.clientX,
    y: e.clientY,
    selectedWord: existingWord || {
      start: textFrom,
      end: textTo,
      token: selectedText.trim(),
    },
    isExistingWord: !!existingWord,
  }
}

const addParlanceWord = () => {
  if (!contextMenu.value.selectedWord) return

  const newWord = {
    start: contextMenu.value.selectedWord.start,
    end: contextMenu.value.selectedWord.end,
    token: contextMenu.value.selectedWord.token,
  }

  const updatedWords = [...props.parlance_words, newWord]
  emit('update:parlance_words', updatedWords)
  closeContextMenu()
}

const removeParlanceWord = () => {
  if (!contextMenu.value.selectedWord) return

  const wordToRemove = contextMenu.value.selectedWord
  const updatedWords = props.parlance_words.filter((word) => {
    // Entferne das Wort wenn start und end passen (mit Toleranz)
    return !(
      Math.abs(word.start - wordToRemove.start) <= 2 && Math.abs(word.end - wordToRemove.end) <= 2
    )
  })

  emit('update:parlance_words', updatedWords)
  closeContextMenu()
}

const closeContextMenu = () => {
  contextMenu.value.visible = false
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
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
