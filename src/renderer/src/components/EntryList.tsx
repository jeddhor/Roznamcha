import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { JournalEntryMeta } from '../../../shared/models'

interface EntryListProps {
  entries: JournalEntryMeta[]
  selectedEntryId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string, bypassConfirmation: boolean) => void
}

export function EntryList({ entries, selectedEntryId, onSelect, onDelete }: EntryListProps): React.JSX.Element {
  return (
    <div className="entries-card mt-3 flex-1 overflow-hidden">
      <div className="entries-header">
        <h3 className="entries-title">Entries</h3>
        <span className="entries-count">{entries.length}</span>
      </div>
      <div className="entries-scroll">
        {entries.map((entry) => (
          <div key={entry.id} className="entry-item-row">
            <button
              className={`entry-item ${selectedEntryId === entry.id ? 'entry-item-active' : ''}`}
              onClick={() => onSelect(entry.id)}
            >
              <div className="flex items-start justify-between">
                <p className="entry-title line-clamp-1">{entry.title || 'Untitled'}</p>
                {entry.isEncrypted ? <span className="entry-lock" title="Encrypted">🔒</span> : null}
              </div>
              <p className="entry-preview line-clamp-2">{entry.preview || 'No content'}</p>
              <p className="entry-time">{format(new Date(entry.updatedAt), 'p')}</p>
            </button>
            <button
              className="entry-delete-btn-inline"
              type="button"
              aria-label={`Delete ${entry.title || 'entry'}`}
              title="Delete entry"
              onClick={(event) => {
                event.stopPropagation()
                onDelete(entry.id, event.shiftKey)
              }}
            >
              <Trash2 size={14} strokeWidth={2.2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
