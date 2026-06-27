import { useState, useEffect, useCallback } from 'react';
import { Entry, getAllEntries, saveEntry, deleteEntry, saveVideo, deleteVideo, saveFile, deleteFile } from './db';
import { analyzeEntry } from './tagger';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import NoteViewer from './components/NoteViewer';
import { isElectron } from './platform';

export type FileAttachment = { blob: Blob; name: string; type: string };

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeEntry, setActiveEntry] = useState<Entry | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('friday-dark') === 'true';
  });
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Editor state (for creating new entries)
  const [editorText, setEditorText] = useState('');
  const [editorVideos, setEditorVideos] = useState<Blob[]>([]);
  const [editorFiles, setEditorFiles] = useState<FileAttachment[]>([]);
  const [showRecorder, setShowRecorder] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAllEntries().then(setEntries).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem('friday-dark', String(darkMode));
  }, [darkMode]);

  const persistEntry = useCallback(async (
    text: string,
    videos: Blob[],
    files: FileAttachment[],
  ): Promise<Entry> => {
    const videoIds: string[] = [];
    for (const blob of videos) {
      const vid = generateId();
      await saveVideo(vid, blob);
      videoIds.push(vid);
    }
    const fileIds: string[] = [];
    for (const f of files) {
      const fid = generateId();
      await saveFile(fid, f.blob, f.name, f.type);
      fileIds.push(fid);
    }
    const { mood, tags } = analyzeEntry(text);
    const entry: Entry = {
      id: generateId(),
      date: todayStr(),
      timestamp: Date.now(),
      text,
      videoIds: videoIds.length > 0 ? videoIds : undefined,
      fileIds: fileIds.length > 0 ? fileIds : undefined,
      mood: mood !== 'note' ? mood : undefined,
      tags: tags.length > 0 ? tags : undefined,
    };
    await saveEntry(entry);
    setEntries(prev => [...prev, entry]);
    return entry;
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorText.trim() && editorVideos.length === 0 && editorFiles.length === 0) return;
    setSaving(true);
    try {
      await persistEntry(editorText, editorVideos, editorFiles);
      setEditorText('');
      setEditorVideos([]);
      setEditorFiles([]);
    } finally {
      setSaving(false);
    }
  }, [editorText, editorVideos, editorFiles, persistEntry]);

  const handleSelectEntry = useCallback(async (entry: Entry) => {
    // Auto-save any unsaved draft before switching
    if (editorText.trim() || editorVideos.length > 0 || editorFiles.length > 0) {
      await persistEntry(editorText, editorVideos, editorFiles);
      setEditorText('');
      setEditorVideos([]);
      setEditorFiles([]);
    }
    setActiveEntry(entry);
  }, [editorText, editorVideos, editorFiles, persistEntry]);

  const handleNewEntry = useCallback(() => {
    setActiveEntry(null);
  }, []);

  // Update an existing entry's text, optional custom title, and optional fileIds
  const handleUpdateEntry = useCallback(async (id: string, text: string, title?: string, fileIds?: string[]) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;
    const { mood, tags } = analyzeEntry(text);
    const updated: Entry = {
      ...entry,
      text,
      mood: mood !== 'note' ? mood : undefined,
      tags: tags.length > 0 ? tags : undefined,
      title: title || undefined,
      ...(fileIds !== undefined ? { fileIds: fileIds.length > 0 ? fileIds : undefined } : {}),
    };
    await saveEntry(updated);
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
    setActiveEntry(updated);
  }, [entries]);

  const handleDelete = useCallback(async (id: string) => {
    const entry = entries.find(e => e.id === id);
    const vids = entry?.videoIds ?? (entry?.videoId ? [entry.videoId] : []);
    for (const vid of vids) await deleteVideo(vid).catch(console.error);
    for (const fid of (entry?.fileIds ?? [])) await deleteFile(fid).catch(console.error);
    await deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
    if (activeEntry?.id === id) setActiveEntry(null);
  }, [entries, activeEntry]);

  if (loading) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="h-screen bg-[#F8F6F2] dark:bg-[#0A0A0A] flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-stone-300 dark:border-stone-600 border-t-stone-600 dark:border-t-stone-300 rounded-full animate-spin"/>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="h-screen flex overflow-hidden bg-[#F8F6F2] dark:bg-[#0A0A0A]">

        {/* Sidebar — slides in/out via width transition */}
        <div className={`shrink-0 transition-[width] duration-200 ease-in-out overflow-hidden ${sidebarOpen ? 'w-[248px]' : 'w-0'}`}>
          <Sidebar
            entries={entries}
            activeEntryId={activeEntry?.id}
            onSelectEntry={handleSelectEntry}
            onNewEntry={handleNewEntry}
            darkMode={darkMode}
            onToggleDark={() => setDarkMode(d => !d)}
            onCollapse={() => setSidebarOpen(false)}
          />
        </div>

        <main className="flex-1 overflow-hidden relative">
          {/* Show-sidebar button when collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Show sidebar"
              className="absolute z-20 text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-700/60 rounded-md w-7 h-7 flex items-center justify-center transition-all"
              style={{
                top: isElectron ? '14px' : '10px',
                left: isElectron ? '76px' : '12px',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="1" width="14" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <line x1="5.5" y1="1.5" x2="5.5" y2="14.5" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
            </button>
          )}

          {/* Main content: new entry editor OR existing entry viewer */}
          {activeEntry ? (
            <NoteViewer
              entry={activeEntry}
              onDelete={() => handleDelete(activeEntry.id)}
              onBack={handleNewEntry}
              onSave={handleUpdateEntry}
              sidebarOpen={sidebarOpen}
            />
          ) : (
            <NoteEditor
              text={editorText}
              onTextChange={setEditorText}
              videoBlobs={editorVideos}
              onVideosChange={setEditorVideos}
              fileAttachments={editorFiles}
              onFilesChange={setEditorFiles}
              onSave={handleSave}
              saving={saving}
              showRecorder={showRecorder}
              onOpenRecorder={() => setShowRecorder(true)}
              onCloseRecorder={() => setShowRecorder(false)}
              sidebarOpen={sidebarOpen}
            />
          )}
        </main>
      </div>
    </div>
  );
}
