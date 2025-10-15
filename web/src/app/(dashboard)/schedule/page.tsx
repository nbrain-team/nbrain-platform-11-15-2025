export default function SchedulePage() {
  // Build 14 days of events without mutating a base Date
  const days = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date(Date.now() + i * 24 * 60 * 60 * 1000)
    const items: Array<{ title: string; project: string; status?: string; type: 'call' | 'delivery' | 'other' }> = []

    // Sample cadence for demo purposes
    if (i % 3 === 0) items.push({ title: 'Strategist call', project: 'PRJ-1993', status: 'Scheduled', type: 'call' })
    if (i % 5 === 0) items.push({ title: 'Reporting agent v1 delivery', project: 'PRJ-2001', status: 'Target', type: 'delivery' })
    if (i % 7 === 0) items.push({ title: 'Kickoff doc review', project: 'PRJ-1980', status: 'In progress', type: 'other' })

    return { date, items }
  })

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

  const toneClass = (type: 'call' | 'delivery' | 'other') => {
    switch (type) {
      case 'call':
        return 'bg-[var(--color-accent-50)]'
      case 'delivery':
        return 'bg-[var(--color-primary-50)]'
      default:
        return 'bg-[var(--color-surface-alt)]'
    }
  }

  const dotClass = (type: 'call' | 'delivery' | 'other') => {
    switch (type) {
      case 'call':
        return 'bg-[var(--color-accent)]'
      case 'delivery':
        return 'bg-[var(--color-primary)]'
      default:
        return 'bg-[var(--color-text-muted)]'
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-text)]">Schedule</h1>
      <p className="mt-1 text-[var(--color-text-muted)]">What’s in flight and when it lands. Calendar view shows starts and completions.</p>

      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {days.map((d, idx) => (
          <div key={idx} className="rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-card">
            <div className="mb-2 font-semibold">{fmt(d.date)}</div>
            <ul className="space-y-2">
              {d.items.length === 0 ? (
                <li className="text-xs text-[var(--color-text-muted)]">No events</li>
              ) : (
                d.items.map((it, i) => (
                  <li key={i} className={`flex items-start gap-2 rounded-md border border-[var(--color-border)] p-2 text-xs ${toneClass(it.type)}`}>
                    <span className={`mt-1 inline-block h-2 w-2 rounded-full ${dotClass(it.type)}`}></span>
                    <div>
                      <div className="font-medium text-[var(--color-text)]">{it.title}</div>
                      <div className="text-[var(--color-text-muted)]">{it.project}{it.status ? ` · ${it.status}` : ''}</div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}


