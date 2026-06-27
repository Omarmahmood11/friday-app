import { useState, useEffect, useRef, useCallback } from 'react';
import { Entry, getVideo, getFile, saveFile, deleteFile, FileRecord } from '../db';
import { deriveTitle, resolveTitle } from '../title';
import { MOOD_META } from '../tagger';
import { tryAutocorrect } from '../autocorrect';

interface Props {
  entry: Entry;
  onDelete: () => void;
  onBack: () => void;
  onSave: (id: string, text: string, title?: string, fileIds?: string[]) => Promise<void>;
  sidebarOpen: boolean;
}

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function wordCount(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function NoteViewer({ entry, onDelete, onBack, onSave, sidebarOpen }: Props) {
  const hasVideo = !!(entry.videoIds?.length || entry.videoId);
  const autoTitle = deriveTitle(entry.text, hasVideo);

  const [editText, setEditText] = useState(entry.text);
  const [editTitle, setEditTitle] = useState(entry.title ?? '');
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const objUrlsRef = useRef<string[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // File state
  const [fileRecords, setFileRecords] = useState<Array<{ id: string; url: string; name: string; type: string; size?: number }>>([]);
  const fileObjUrlsRef = useRef<string[]>([]);
  const [stagedFiles, setStagedFiles] = useState<Array<{ blob: Blob; url: string; name: string; type: string; size: number }>>([]);
  const [removedFileIds, setRemovedFileIds] = useState<Set<string>>(new Set());
  const [isDragOver, setIsDragOver] = useState(false);

  // Reset local state when a different entry is selected
  useEffect(() => {
    setEditText(entry.text);
    setEditTitle(entry.title ?? '');
    setIsTitleEditing(false);
    setStagedFiles([]);
    setRemovedFileIds(new Set());
  }, [entry.id]);

  // Auto-focus title input when editing starts
  useEffect(() => {
    if (isTitleEditing) {
      titleInputRef.current?.select();
    }
  }, [isTitleEditing]);

  // Auto-resize textarea whenever editText changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  // Load videos
  useEffect(() => {
    objUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    objUrlsRef.current = [];
    setVideoUrls([]);

    const ids = entry.videoIds ?? (entry.videoId ? [entry.videoId] : []);
    if (ids.length === 0) return;

    let cancelled = false;
    Promise.all(ids.map(id => getVideo(id))).then(blobs => {
      if (cancelled) return;
      const urls = blobs.filter((b): b is Blob => b !== null).map(b => URL.createObjectURL(b));
      objUrlsRef.current = urls;
      setVideoUrls(urls);
    });

    return () => {
      cancelled = true;
      objUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      objUrlsRef.current = [];
    };
  }, [entry.id]);

  // Load files from DB
  useEffect(() => {
    fileObjUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    fileObjUrlsRef.current = [];
    setFileRecords([]);

    const ids = entry.fileIds ?? [];
    if (ids.length === 0) return;

    let cancelled = false;
    Promise.all(ids.map(id => getFile(id))).then(records => {
      if (cancelled) return;
      const valid = records.filter((r): r is FileRecord => r !== null);
      const urls = valid.map(r => URL.createObjectURL(r.blob));
      fileObjUrlsRef.current = urls;
      setFileRecords(valid.map((r, i) => ({
        id: r.id,
        url: urls[i],
        name: r.name,
        type: r.type,
        size: r.blob.size,
      })));
    });

    return () => {
      cancelled = true;
      fileObjUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      fileObjUrlsRef.current = [];
    };
  }, [entry.id]);

  const isDirty = editText !== entry.text
    || editTitle !== (entry.title ?? '')
    || stagedFiles.length > 0
    || removedFileIds.size > 0;

  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    setSaving(true);
    try {
      // Delete removed files from DB
      for (const id of removedFileIds) {
        await deleteFile(id);
      }

      // Save staged new files to DB
      const savedItems: Array<{ id: string; url: string; name: string; type: string; size: number }> = [];
      for (const f of stagedFiles) {
        const id = generateId();
        await saveFile(id, f.blob, f.name, f.type);
        savedItems.push({ id, url: f.url, name: f.name, type: f.type, size: f.size });
      }

      // Compute final fileIds
      const remainingLoaded = fileRecords.filter(f => !removedFileIds.has(f.id));
      const finalFileIds = [
        ...remainingLoaded.map(f => f.id),
        ...savedItems.map(f => f.id),
      ];

      await onSave(entry.id, editText, editTitle.trim() || undefined, finalFileIds);

      // Update local file state
      setFileRecords([...remainingLoaded, ...savedItems]);
      setStagedFiles([]);
      setRemovedFileIds(new Set());
    } finally {
      setSaving(false);
    }
  }, [isDirty, onSave, entry.id, editText, editTitle, removedFileIds, stagedFiles, fileRecords]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursor = e.target.selectionStart ?? newText.length;

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;

    if (cursor > 0 && (newText[cursor - 1] === ' ' || newText[cursor - 1] === '\n')) {
      const result = tryAutocorrect(newText, cursor - 1);
      if (result) {
        setEditText(result.text);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.cursorPos;
            textareaRef.current.selectionEnd = result.cursorPos;
          }
        });
        return;
      }
    }

    setEditText(newText);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const addFiles = useCallback((files: File[]) => {
    const newItems = files.map(f => ({
      blob: f as Blob,
      url: URL.createObjectURL(f),
      name: f.name,
      type: f.type || 'application/octet-stream',
      size: f.size,
    }));
    setStagedFiles(prev => [...prev, ...newItems]);
  }, []);

  const removeStagedFile = (idx: number) => {
    setStagedFiles(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addFiles(files);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) addFiles(files);
  };

  const displayTitle = editTitle.trim() || autoTitle;
  const moodMeta = entry.mood ? MOOD_META[entry.mood as keyof typeof MOOD_META] : null;
  const words = wordCount(editText);

  const visibleLoadedFiles = fileRecords.filter(f => !removedFileIds.has(f.id));
  const allFiles = [
    ...visibleLoadedFiles.map(f => ({ ...f, isLoaded: true as const })),
    ...stagedFiles.map((f, i) => ({ ...f, id: `staged-${i}`, isLoaded: false as const, stagedIdx: i })),
  ];
  const imageFiles = allFiles.filter(f => f.type.startsWith('image/'));
  const otherFiles = allFiles.filter(f => !f.type.startsWith('image/'));
  const totalFiles = allFiles.length;

  return (
    <div
      className="h-full flex flex-col relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-10 bg-[#F8F6F2]/90 dark:bg-[#0A0A0A]/90 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-2xl px-14 py-10 flex flex-col items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-stone-400 dark:text-stone-500">
              <path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="text-stone-500 dark:text-stone-400 text-[14px] font-medium">Drop to attach</span>
          </div>
        </div>
      )}

      {/* Scrollable content */}
      <div className={`flex-1 overflow-y-auto px-6 pb-6 ${sidebarOpen ? 'pt-14' : 'pt-16'}`}>
        <div className="max-w-2xl mx-auto w-full">

          {/* Editable title */}
          {isTitleEditing ? (
            <input
              ref={titleInputRef}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={() => setIsTitleEditing(false)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); setIsTitleEditing(false); }
                if (e.key === 'Escape') { setEditTitle(entry.title ?? ''); setIsTitleEditing(false); }
              }}
              placeholder={autoTitle}
              className="w-full text-2xl font-semibold text-stone-900 dark:text-stone-50 mb-1 leading-tight bg-transparent outline-none border-b border-stone-300 dark:border-stone-600 pb-0.5"
              style={{ fontFamily: 'inherit' }}
            />
          ) : (
            <h1
              onClick={() => setIsTitleEditing(true)}
              title="Click to edit title"
              className="text-2xl font-semibold text-stone-900 dark:text-stone-50 mb-1 leading-tight cursor-text hover:opacity-75 transition-opacity"
            >
              {displayTitle}
            </h1>
          )}
          <p className="text-[11.5px] text-stone-400 dark:text-stone-500 mb-3 font-medium">
            {formatDateTime(entry.timestamp)}
          </p>

          {/* Mood + topic tags */}
          {(moodMeta || (entry.tags && entry.tags.length > 0)) && (
            <div className="flex items-center flex-wrap gap-1.5 mb-5">
              {moodMeta && (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${moodMeta.badgeClass}`}>
                  {moodMeta.label}
                </span>
              )}
              {entry.tags?.map(tag => (
                <span
                  key={tag}
                  className="text-[11px] text-stone-400 dark:text-stone-500 px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Image attachments */}
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {imageFiles.map(f => (
                <div key={f.id} className="relative group">
                  <img
                    src={f.url}
                    alt={f.name}
                    className="rounded-2xl max-h-52 object-cover shadow-sm bg-stone-100 dark:bg-stone-800"
                    style={{ maxWidth: '260px' }}
                  />
                  <button
                    onClick={() => {
                      if (f.isLoaded) setRemovedFileIds(prev => new Set([...prev, f.id]));
                      else removeStagedFile((f as typeof stagedFiles[0] & { stagedIdx: number }).stagedIdx);
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Videos */}
          {videoUrls.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-4">
              {videoUrls.map((url, i) => (
                <video
                  key={i}
                  src={url}
                  controls
                  playsInline
                  className="rounded-xl max-h-52 bg-stone-900 object-cover shadow-sm"
                  style={{ maxWidth: '260px' }}
                />
              ))}
            </div>
          )}

          {/* Non-image file chips */}
          {otherFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {otherFiles.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-800 group"
                >
                  <svg width="12" height="14" viewBox="0 0 12 14" fill="none" className="text-stone-400 dark:text-stone-500 shrink-0">
                    <path d="M1.5 1.5h6L10.5 5v7.5a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5v-11a.5.5 0 01.5-.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                    <path d="M7.5 1.5V5H10.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                  <a
                    href={f.url}
                    download={f.name}
                    className="text-[12px] text-stone-600 dark:text-stone-300 truncate max-w-[160px] hover:underline"
                  >
                    {f.name}
                  </a>
                  {f.size != null && (
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                      {formatSize(f.size)}
                    </span>
                  )}
                  <button
                    onClick={() => {
                      if (f.isLoaded) setRemovedFileIds(prev => new Set([...prev, f.id]));
                      else removeStagedFile((f as typeof stagedFiles[0] & { stagedIdx: number }).stagedIdx);
                    }}
                    className="text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors ml-0.5"
                  >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Editable text */}
          <textarea
            ref={textareaRef}
            value={editText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-stone-800 dark:text-stone-100 text-[18px] leading-[1.8] overflow-hidden"
            style={{ fontFamily: 'inherit', minHeight: '40vh' }}
          />

        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="shrink-0 border-t border-stone-200/50 dark:border-stone-700/50 px-6 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* Back to new note */}
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-[13px] font-medium text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M9 11.5L3.5 7 9 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New note
          </button>

          {/* Attach file button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all active:scale-95 ${
              totalFiles > 0
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.5 8.5L7.5 14.5a4 4 0 01-5.657-5.657l7.07-7.07a2.5 2.5 0 013.536 3.536L5.378 12.38a1 1 0 01-1.414-1.414l6.364-6.364"/>
            </svg>
            {totalFiles > 0 ? `${totalFiles} file${totalFiles > 1 ? 's' : ''}` : 'Attach'}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />

          <div className="ml-auto flex items-center gap-3">
            {words > 0 && (
              <span className="text-[11px] text-stone-300 dark:text-stone-600 tabular-nums">{words}w</span>
            )}
            {isDirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-25 active:scale-95 transition-all"
              >
                {saving ? 'Saving…' : 'Save'}
                {!saving && <span className="text-white/40 dark:text-stone-900/40 text-[11px]">⌘↵</span>}
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-[13px] text-stone-300 dark:text-stone-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
