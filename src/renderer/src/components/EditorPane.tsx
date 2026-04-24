import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { marked } from 'marked'
import TurndownService from 'turndown'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Table2,
  Link2,
  ArrowRightLeft,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react'
import { AppSettings, EncryptionScope, JournalEntry } from '../../../shared/models'

interface EditorPaneProps {
  entry: JournalEntry | null
  settings: AppSettings
  isSaving: boolean
  onSave: (input: {
    title: string
    content: string
    tags: string[]
    encryptionScope: EncryptionScope
    password?: string
  }) => Promise<void>
  onLock: () => Promise<void>
  onUnlock: (password: string) => Promise<void>
}

function normalizeRichTextHtml(html: string): string {
  const cleaned = html
    .replace(/<p><\/p>/g, '')
    .replace(/<p>\s*<br\s*\/?\s*>\s*<\/p>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()

  return cleaned ? html : ''
}

function normalizeMarkdownText(markdown: string): string {
  return markdown.trim().length === 0 ? '' : markdown
}

export function EditorPane({ entry, settings, isSaving, onSave, onLock, onUnlock }: EditorPaneProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [markdownInput, setMarkdownInput] = useState('')
  const [scope, setScope] = useState<EncryptionScope>(settings.defaultEncryptionScope)
  const [password, setPassword] = useState('')
  const [showEntryPassword, setShowEntryPassword] = useState(false)
  const [unlockPassword, setUnlockPassword] = useState('')
  const [showMarkdown, setShowMarkdown] = useState(false)
  const currentEntryIdRef = useRef<string | null>(null)

  const isMacLikePlatform = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  const modifierKey = isMacLikePlatform ? 'Cmd' : 'Ctrl'

  const withModifier = (shortcut: string): string => `${modifierKey}+${shortcut}`

  const turndown = useMemo(() => new TurndownService(), [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader
    ],
    content: '',
    immediatelyRender: false
  })

  useEffect(() => {
    if (!entry) {
      setTitle('')
      setTagsInput('')
      setMarkdownInput('')
      setScope(settings.defaultEncryptionScope)
      setPassword('')
      setShowEntryPassword(false)
      setUnlockPassword('')
      setShowMarkdown(false)
      currentEntryIdRef.current = null
      return
    }

    const isNewEntrySelection = currentEntryIdRef.current !== entry.id

    if (isNewEntrySelection) {
      setTitle(entry.title)
      setTagsInput(entry.tags.join(', '))
      setScope(entry.encryptionScope)
      setPassword('')
      setShowEntryPassword(false)
      setUnlockPassword('')
      setShowMarkdown(false)
      currentEntryIdRef.current = entry.id
    }

    if (!entry.isLocked) {
      editor?.commands.setContent(entry.content || '<p></p>', { emitUpdate: false })
      setMarkdownInput(normalizeMarkdownText(turndown.turndown(entry.content || '')))
    } else {
      editor?.commands.clearContent()
      setMarkdownInput('')
    }
  }, [entry, editor, turndown])

  if (!entry) {
    return (
      <div className="card empty-entry-state flex h-full items-center justify-center text-[var(--muted-text)]">
        Create an entry to begin.
      </div>
    )
  }

  if (entry.isLocked) {
    return (
      <div className="card encrypted-entry-card">
        <h2 className="encrypted-entry-title">
          <Lock size={18} strokeWidth={2.2} aria-hidden="true" />
          <span>Encrypted Entry</span>
        </h2>
        <p className="encrypted-entry-description">This entry is locked. Enter the password to decrypt.</p>
        <div className="encrypted-entry-actions">
          <input
            className="field"
            type="password"
            placeholder="Password"
            value={unlockPassword}
            onChange={(event) => setUnlockPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void onUnlock(unlockPassword)
              }
            }}
          />
          <button className="primary-btn" onClick={() => onUnlock(unlockPassword)}>
            Unlock
          </button>
        </div>
      </div>
    )
  }

  const tags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)

  const saveNow = async (): Promise<void> => {
    const html = normalizeRichTextHtml(editor?.getHTML() ?? '')
    await onSave({
      title,
      content: html,
      tags,
      encryptionScope: scope,
      password: scope === 'entry' ? password : undefined
    })
  }

  const syncMarkdownToEditor = (): void => {
    const html = marked.parse(markdownInput || '') as string
    editor?.commands.setContent(html, { emitUpdate: false })
  }

  const syncEditorToMarkdown = (): void => {
    const html = normalizeRichTextHtml(editor?.getHTML() || '')
    setMarkdownInput(normalizeMarkdownText(turndown.turndown(html)))
  }

  return (
    <div className="card flex h-full flex-col overflow-hidden">
      <div className="editor-header">
        <div className="entry-title-row">
          <input
            data-entry-title
            className="entry-title-input"
            value={title}
            placeholder="Entry title"
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className={`save-status ${isSaving ? 'save-status-visible' : ''}`} aria-live="polite">
            <span className="save-spinner" aria-hidden="true" />
            <span>Saving</span>
          </div>
        </div>
        <div className="entry-meta-grid">
          <label className="meta-field">
            <span className="meta-label">Tags</span>
            <input
              className="field"
              data-entry-tags
              value={tagsInput}
              placeholder="focus, gratitude, work"
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </label>

          <label className="meta-field">
            <span className="meta-label">Encryption</span>
            <select
              className="field"
              data-entry-encryption-scope
              value={scope}
              onChange={(event) => setScope(event.target.value as EncryptionScope)}
            >
              <option value="none">No encryption</option>
              <option value="entry">Per-entry password</option>
              <option value="global">Global vault</option>
            </select>
          </label>

          {scope === 'entry' ? (
            <label className="meta-field">
              <span className="meta-label">Entry password</span>
              <div className="password-field-wrap">
                <input
                  className="field password-field"
                  data-entry-password
                  type={showEntryPassword ? 'text' : 'password'}
                  value={password}
                  placeholder="Required"
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void saveNow()
                    }
                  }}
                />
                <button
                  className="password-visibility-btn"
                  type="button"
                  aria-label={showEntryPassword ? 'Hide password' : 'Show password'}
                  title={showEntryPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowEntryPassword((value) => !value)}
                >
                  {showEntryPassword ? <EyeOff size={16} strokeWidth={2.2} /> : <Eye size={16} strokeWidth={2.2} />}
                </button>
              </div>
            </label>
          ) : (
            <div className="meta-field meta-field-placeholder" />
          )}

          <div className="entry-meta-actions">
            <button className="primary-btn" onClick={saveNow}>
              Save
            </button>
            <button className="ghost-btn" onClick={onLock}>
              Lock
            </button>
          </div>
        </div>
      </div>

      <div className="editor-toolbar-shell">
        <div className="toolbar">
          <div className="toolbar-group" aria-label="Text styles">
            <button
              className={`toolbar-btn ${editor?.isActive('bold') ? 'toolbar-btn-active' : ''}`}
              title={`Bold (${withModifier('B')})`}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <Bold size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('italic') ? 'toolbar-btn-active' : ''}`}
              title={`Italic (${withModifier('I')})`}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <Italic size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('underline') ? 'toolbar-btn-active' : ''}`}
              title={`Underline (${withModifier('U')})`}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('strike') ? 'toolbar-btn-active' : ''}`}
              title={`Strikethrough (${withModifier('Shift+X')})`}
              onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
              <Strikethrough size={18} strokeWidth={2.2} />
            </button>
          </div>

          <span className="toolbar-divider" />

          <div className="toolbar-group" aria-label="Structure">
            <button
              className={`toolbar-btn ${editor?.isActive('heading', { level: 2 }) ? 'toolbar-btn-active' : ''}`}
              title="Heading"
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            >
              <Heading2 size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('bulletList') ? 'toolbar-btn-active' : ''}`}
              title={`Bulleted List (${withModifier('Shift+8')})`}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('orderedList') ? 'toolbar-btn-active' : ''}`}
              title={`Numbered List (${withModifier('Shift+7')})`}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('blockquote') ? 'toolbar-btn-active' : ''}`}
              title="Blockquote"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote size={18} strokeWidth={2.2} />
            </button>
          </div>

          <span className="toolbar-divider" />

          <div className="toolbar-group" aria-label="Insert">
            <button
              className={`toolbar-btn ${editor?.isActive('codeBlock') ? 'toolbar-btn-active' : ''}`}
              title="Code Block"
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <Code size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('table') ? 'toolbar-btn-active' : ''}`}
              title="Insert Table"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <Table2 size={18} strokeWidth={2.2} />
            </button>
            <button
              className={`toolbar-btn ${editor?.isActive('link') ? 'toolbar-btn-active' : ''}`}
              title={`Link (${withModifier('K')})`}
              onClick={() => editor?.chain().focus().setLink({ href: prompt('Link URL') || '' }).run()}
            >
              <Link2 size={18} strokeWidth={2.2} />
            </button>
          </div>

          <span className="toolbar-divider" />

          <div className="toolbar-group" aria-label="Markdown sync">
            <button className="toolbar-btn toolbar-wide" onClick={syncEditorToMarkdown}>
              <ArrowRightLeft size={18} strokeWidth={2.2} />
              To MD
            </button>
            <button className="toolbar-btn toolbar-wide" onClick={syncMarkdownToEditor}>
              <ArrowRightLeft size={18} strokeWidth={2.2} />
              From MD
            </button>
          </div>

          <span className="toolbar-divider" />

          <div className="toolbar-group" aria-label="Markdown drawer">
            <button className="toolbar-btn toolbar-wide" onClick={() => setShowMarkdown((value) => !value)}>
              <FileCode2 size={18} strokeWidth={2.2} />
              Markdown
              {showMarkdown ? <ChevronDown size={16} strokeWidth={2.2} /> : <ChevronUp size={16} strokeWidth={2.2} />}
            </button>
          </div>
        </div>
      </div>

      <div className="editor-split">
        <div className="editor-pane">
          <EditorContent editor={editor} />
        </div>

        <div className={`markdown-drawer ${showMarkdown ? 'markdown-drawer-open' : ''}`}>
          <div className="markdown-drawer-header">
            <span>Raw Markdown</span>
            <button className="ghost-btn" onClick={() => setShowMarkdown(false)}>
              Close
            </button>
          </div>
          <textarea
            className="markdown-drawer-textarea"
            value={markdownInput}
            onChange={(event) => setMarkdownInput(event.target.value)}
            placeholder="Markdown source"
          />
        </div>
      </div>
    </div>
  )
}
