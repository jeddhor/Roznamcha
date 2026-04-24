import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  startOfMonth,
  subMonths,
  subYears
} from 'date-fns'

interface CalendarWidgetProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

export function CalendarWidget({ selectedDate, onSelectDate }: CalendarWidgetProps): React.JSX.Element {
  const monthStart = startOfMonth(selectedDate)
  const monthEnd = endOfMonth(selectedDate)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingSlots = monthStart.getDay()
  const calendarCells = [
    ...Array.from({ length: leadingSlots }, (_, index) => ({ key: `empty-${index}`, day: null })),
    ...days.map((day) => ({ key: day.toISOString(), day }))
  ]

  return (
    <div className="calendar-card">
      <div className="calendar-top">
        <div className="calendar-nav-group">
          <button className="calendar-nav calendar-nav-year" title="Previous year" onClick={() => onSelectDate(subYears(selectedDate, 1))}>
            «
          </button>
          <button className="calendar-nav" title="Previous month" onClick={() => onSelectDate(subMonths(selectedDate, 1))}>
            ‹
          </button>
        </div>
        <h2 className="calendar-month">{format(selectedDate, 'MMMM yyyy')}</h2>
        <div className="calendar-nav-group calendar-nav-group-end">
          <button className="calendar-nav" title="Next month" onClick={() => onSelectDate(addMonths(selectedDate, 1))}>
            ›
          </button>
          <button className="calendar-nav calendar-nav-year" title="Next year" onClick={() => onSelectDate(addYears(selectedDate, 1))}>
            »
          </button>
        </div>
      </div>

      <div className="calendar-weekdays">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarCells.map((cell) => {
          if (!cell.day) {
            return <span key={cell.key} className="calendar-empty" />
          }

          const selected = isSameDay(cell.day, selectedDate)
          return (
            <button
              key={cell.key}
              className={`calendar-day ${selected ? 'calendar-day-active' : ''}`}
              onClick={() => onSelectDate(cell.day)}
            >
              {format(cell.day, 'd')}
            </button>
          )
        })}
      </div>
    </div>
  )
}
