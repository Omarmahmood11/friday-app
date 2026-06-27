import { useMemo } from 'react';
import { Entry } from '../db';
import EntryCard from './EntryCard';

interface Props {
  entries: Entry[];
  onNewEntry: () => void;
  onDeleteEntry: (id: string) => void;
}

// Detect whether we're running inside Electron
const isElectron = navigator.userAgent.includes('Electron');

function formatDateHeader(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
  });
}

export default function JournalView({ entries, onNewEntry, onDeleteEntry }: Props) {
  const grouped = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const groups: { date: string; entries: Entry[] }[] = [];
    for (const entry of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.date === entry.date) {
        last.entries.push(entry);
      } else {
        groups.push({ date: entry.date, entries: [entry] });
      }
    }
    return groups;
  }, [entries]);

  return (
    <div className="min-h-screen bg-[#F8F6F2]">
      {/* Header — extra left padding on Electron for traffic lights */}
      <header
        className="sticky top-0 z-10 bg-[#F8F6F2]/95 backdrop-blur-sm border-b border-stone-200/50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="max-w-xl mx-auto py-4 flex items-center justify-between"
          style={{ paddingLeft: isElectron ? '84px' : '20px', paddingRight: '20px' }}
        >
          <span className="text-base font-semibold text-stone-900 tracking-tight select-none">
            Friday
          </span>
          <button
            onClick={onNewEntry}
            className="flex items-center gap-1.5 bg-stone-900 text-white text-sm font-medium px-3.5 py-2 rounded-full hover:bg-stone-700 active:scale-95 transition-all"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-xl mx-auto px-5 py-7">
        {entries.length === 0 ? (
          <EmptyState onNewEntry={onNewEntry} />
        ) : (
          <div className="space-y-9">
            {grouped.map(({ date, entries: dayEntries }) => (
              <section key={date}>
                <p className="text-[10.5px] font-semibold text-stone-400 uppercase tracking-[0.12em] mb-3 px-1">
                  {formatDateHeader(date)}
                </p>
                <div className="space-y-2.5">
                  {dayEntries.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onDelete={() => onDeleteEntry(entry.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EmptyState({ onNewEntry }: { onNewEntry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[68vh] text-center select-none">
      <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-stone-400">
          <path d="M12 20h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <p className="text-stone-800 font-semibold text-lg mb-1.5">Nothing here yet</p>
      <p className="text-stone-400 text-sm mb-8 max-w-[220px] leading-relaxed">
        Capture your thoughts, ideas, and moments.
      </p>
      <button
        onClick={onNewEntry}
        className="bg-stone-900 text-white text-sm font-medium px-6 py-2.5 rounded-full hover:bg-stone-700 active:scale-95 transition-all"
      >
        Start writing
      </button>
    </div>
  );
}
