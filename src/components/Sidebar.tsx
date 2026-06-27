import { useMemo, useState } from 'react';
import { Entry } from '../db';
import { resolveTitle } from '../title';
import { MOOD_META, MOOD_ORDER } from '../tagger';
import { isElectron } from '../platform';

interface Props {
  entries: Entry[];
  activeEntryId?: string;
  onSelectEntry: (entry: Entry) => void;
  onNewEntry: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  onCollapse: () => void;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDateHeader(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today.getTime() - 86400000).toISOString().split('T')[0];
  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type ViewMode = 'date' | 'type';

export default function Sidebar({ entries, activeEntryId, onSelectEntry, onNewEntry, darkMode, onToggleDark, onCollapse }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('date');

  const groupedByDate = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const groups: { date: string; entries: Entry[] }[] = [];
    for (const entry of sorted) {
      const last = groups[groups.length - 1];
      if (last && last.date === entry.date) last.entries.push(entry);
      else groups.push({ date: entry.date, entries: [entry] });
    }
    return groups;
  }, [entries]);

  const groupedByType = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.timestamp - a.timestamp);
    const buckets: Record<string, Entry[]> = {};
    for (const entry of sorted) {
      const key = entry.mood || 'note';
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(entry);
    }
    return MOOD_ORDER.filter(m => buckets[m]?.length > 0).map(m => ({ mood: m, entries: buckets[m] }));
  }, [entries]);

  const renderEntry = (entry: Entry) => {
    const isActive = entry.id === activeEntryId;
    const hasVideo = !!(entry.videoIds?.length || entry.videoId);
    const title = resolveTitle(entry);
    const moodDot = entry.mood ? MOOD_META[entry.mood as keyof typeof MOOD_META]?.dotColor : null;

    return (
      <button
        key={entry.id}
        onClick={() => onSelectEntry(entry)}
        className={`w-full text-left px-3.5 py-2 mx-1 rounded-lg flex items-center gap-2 transition-all group ${
          isActive
            ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900'
            : 'hover:bg-stone-200/70 dark:hover:bg-stone-700/60 text-stone-700 dark:text-stone-300'
        }`}
        style={{ width: 'calc(100% - 8px)' }}
      >
        {/* Mood dot */}
        {moodDot && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${moodDot} ${isActive ? 'opacity-60' : ''}`} />
        )}
        {/* Video icon */}
        {hasVideo && !moodDot && (
          <svg
            width="9" height="9" viewBox="0 0 16 16" fill="currentColor"
            className={`shrink-0 ${isActive ? 'text-white/60 dark:text-stone-900/60' : 'text-stone-400 dark:text-stone-500'}`}
          >
            <path d="M0 3.5A1.5 1.5 0 011.5 2h10A1.5 1.5 0 0113 3.5v2.695l1.721-1.333A.5.5 0 0116 5.195v5.61a.5.5 0 01-.779.414L13 9.82V12.5A1.5 1.5 0 0111.5 14h-10A1.5 1.5 0 010 12.5v-9z"/>
          </svg>
        )}
        <span className="flex-1 text-[12px] font-medium truncate">{title}</span>
        <span className={`text-[10px] tabular-nums shrink-0 ${isActive ? 'text-white/50 dark:text-stone-900/50' : 'text-stone-400 dark:text-stone-500'}`}>
          {formatTime(entry.timestamp)}
        </span>
      </button>
    );
  };

  return (
    <aside className="w-[248px] shrink-0 h-full flex flex-col border-r border-stone-200/70 dark:border-stone-700/70 bg-[#EFEDE9] dark:bg-[#111111] overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 border-b border-stone-200/70 dark:border-stone-700/70"
        style={{
          paddingTop: isElectron ? '20px' : '14px',
          paddingBottom: '12px',
          paddingLeft: isElectron ? '80px' : '14px',
          paddingRight: '12px',
          WebkitAppRegion: 'drag',
        } as React.CSSProperties}
      >
        {/* Logo + title + controls */}
        <div className="flex items-center justify-between">
          {/* Left: logo + name */}
          {isElectron ? (
            <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-200 select-none tracking-tight">
              Friday
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-[22px] h-[22px] bg-stone-900 dark:bg-stone-100 rounded-[5px] flex items-center justify-center shrink-0">
                <span className="text-white dark:text-stone-900 text-[10px] font-bold leading-none select-none">F.</span>
              </div>
              <span className="text-[13px] font-semibold text-stone-700 dark:text-stone-200 select-none tracking-tight">
                Friday
              </span>
            </div>
          )}

          <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            {/* Dark mode button */}
            <button
              onClick={onToggleDark}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              {darkMode ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z"/>
                </svg>
              )}
            </button>

            {/* New entry */}
            <button
              onClick={onNewEntry}
              title="New entry"
              className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Collapse sidebar */}
            <button
              onClick={onCollapse}
              title="Hide sidebar"
              className="w-6 h-6 flex items-center justify-center rounded-md text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-all"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="5.5" y1="1.5" x2="5.5" y2="14.5" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* View toggle */}
      {entries.length > 0 && (
        <div className="shrink-0 flex items-center gap-3 px-4 pt-2.5 pb-0">
          {(['date', 'type'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`text-[9px] font-bold uppercase tracking-[0.13em] transition-colors ${
                viewMode === mode
                  ? 'text-stone-700 dark:text-stone-200'
                  : 'text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {entries.length === 0 ? (
          <p className="text-[11px] text-stone-400 dark:text-stone-500 text-center mt-10 px-5 leading-relaxed">
            Your notes will appear here
          </p>
        ) : viewMode === 'date' ? (
          groupedByDate.map(({ date, entries: dayEntries }) => (
            <div key={date} className="mb-1">
              <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.14em] px-4 pt-3 pb-1.5">
                {formatDateHeader(date)}
              </p>
              {dayEntries.map(renderEntry)}
            </div>
          ))
        ) : (
          groupedByType.map(({ mood, entries: moodEntries }) => {
            const meta = MOOD_META[mood as keyof typeof MOOD_META];
            return (
              <div key={mood} className="mb-1">
                <div className="flex items-center gap-1.5 px-4 pt-3 pb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${meta.dotColor}`} />
                  <p className="text-[9px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-[0.14em]">
                    {meta.plural}
                  </p>
                </div>
                {moodEntries.map(renderEntry)}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
