import { useEffect, useRef, useCallback, useState } from 'react';
import VideoRecorder from './VideoRecorder';
import { tryAutocorrect } from '../autocorrect';
import type { FileAttachment } from '../App';

interface Props {
  text: string;
  onTextChange: (t: string) => void;
  videoBlobs: Blob[];
  onVideosChange: (blobs: Blob[]) => void;
  fileAttachments: FileAttachment[];
  onFilesChange: (files: FileAttachment[]) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  showRecorder: boolean;
  onOpenRecorder: () => void;
  onCloseRecorder: () => void;
  sidebarOpen: boolean;
}

const PLACEHOLDERS = [
  "What's on your mind…",
  "Something worth remembering?",
  "Start anywhere.",
  "What happened today?",
  "An idea worth keeping?",
  "Write it down before it fades.",
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'Good morning.';
  if (h >= 12 && h < 17) return 'Good afternoon.';
  if (h >= 17 && h < 21) return 'Good evening.';
  return 'Late night thoughts?';
}

function getPlaceholder(): string {
  const idx = Math.floor(Date.now() / (1000 * 60 * 5)) % PLACEHOLDERS.length;
  return PLACEHOLDERS[idx];
}

function wordCount(text: string) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export default function NoteEditor({
  text, onTextChange,
  videoBlobs, onVideosChange,
  fileAttachments, onFilesChange,
  onSave, saving,
  showRecorder, onOpenRecorder, onCloseRecorder,
  sidebarOpen,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const [greeting] = useState(getGreeting);
  const [placeholder] = useState(getPlaceholder);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto-resize textarea whenever text changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  // Track blob URLs, recreating them only when blobs array changes
  const urlsRef = useRef<{ blob: Blob; url: string }[]>([]);

  const currentUrls: string[] = videoBlobs.map((blob, i) => {
    const existing = urlsRef.current[i];
    if (existing && existing.blob === blob) return existing.url;
    if (existing) URL.revokeObjectURL(existing.url);
    const url = URL.createObjectURL(blob);
    urlsRef.current[i] = { blob, url };
    return url;
  });
  if (urlsRef.current.length > videoBlobs.length) {
    urlsRef.current.slice(videoBlobs.length).forEach(e => URL.revokeObjectURL(e.url));
    urlsRef.current = urlsRef.current.slice(0, videoBlobs.length);
  }

  // Track file blob URLs
  const fileUrlsRef = useRef<{ blob: Blob; url: string }[]>([]);
  const currentFileUrls: string[] = fileAttachments.map((f, i) => {
    const existing = fileUrlsRef.current[i];
    if (existing && existing.blob === f.blob) return existing.url;
    if (existing) URL.revokeObjectURL(existing.url);
    const url = URL.createObjectURL(f.blob);
    fileUrlsRef.current[i] = { blob: f.blob, url };
    return url;
  });
  if (fileUrlsRef.current.length > fileAttachments.length) {
    fileUrlsRef.current.slice(fileAttachments.length).forEach(e => URL.revokeObjectURL(e.url));
    fileUrlsRef.current = fileUrlsRef.current.slice(0, fileAttachments.length);
  }

  useEffect(() => {
    textareaRef.current?.focus();
    return () => {
      urlsRef.current.forEach(e => URL.revokeObjectURL(e.url));
      fileUrlsRef.current.forEach(e => URL.revokeObjectURL(e.url));
    };
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursor = e.target.selectionStart ?? newText.length;

    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;

    if (cursor > 0 && (newText[cursor - 1] === ' ' || newText[cursor - 1] === '\n')) {
      const result = tryAutocorrect(newText, cursor - 1);
      if (result) {
        onTextChange(result.text);
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            textareaRef.current.selectionStart = result.cursorPos;
            textareaRef.current.selectionEnd = result.cursorPos;
          }
        });
        return;
      }
    }

    onTextChange(newText);
  }, [onTextChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSave();
    }
  };

  const removeVideo = (idx: number) => {
    onVideosChange(videoBlobs.filter((_, i) => i !== idx));
  };

  const addVideo = (blob: Blob) => {
    onVideosChange([...videoBlobs, blob]);
    onCloseRecorder();
  };

  const addFiles = useCallback((files: File[]) => {
    const newAttachments: FileAttachment[] = files.map(f => ({
      blob: f as Blob,
      name: f.name,
      type: f.type || 'application/octet-stream',
    }));
    onFilesChange([...fileAttachments, ...newAttachments]);
  }, [fileAttachments, onFilesChange]);

  const removeFile = (idx: number) => {
    onFilesChange(fileAttachments.filter((_, i) => i !== idx));
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

  const imageFiles = fileAttachments
    .map((f, i) => ({ ...f, url: currentFileUrls[i], idx: i }))
    .filter(f => f.type.startsWith('image/'));

  const otherFiles = fileAttachments
    .map((f, i) => ({ ...f, url: currentFileUrls[i], idx: i }))
    .filter(f => !f.type.startsWith('image/'));

  const isEmpty = !text && videoBlobs.length === 0 && fileAttachments.length === 0;
  const canSave = text.trim().length > 0 || videoBlobs.length > 0 || fileAttachments.length > 0;
  const words = wordCount(text);
  const totalFiles = fileAttachments.length;

  return (
    <>
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

        {/* Writing area */}
        <div className={`flex-1 overflow-y-auto px-6 pb-6 ${sidebarOpen ? 'pt-14' : 'pt-16'}`}>
          <div className="max-w-2xl mx-auto w-full">

            {isEmpty && (
              <p className="text-stone-300 dark:text-stone-600 text-[15px] font-medium mb-8 select-none pointer-events-none">
                {greeting}
              </p>
            )}

            {/* Image attachments */}
            {imageFiles.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {imageFiles.map(f => (
                  <div key={f.idx} className="relative group">
                    <img
                      src={f.url}
                      alt={f.name}
                      className="rounded-2xl max-h-48 object-cover shadow-sm bg-stone-100 dark:bg-stone-800"
                      style={{ maxWidth: '280px' }}
                    />
                    <button
                      onClick={() => removeFile(f.idx)}
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

            {/* Video attachments */}
            {currentUrls.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-4">
                {currentUrls.map((url, i) => (
                  <div key={i} className="relative">
                    <video
                      src={url}
                      controls
                      playsInline
                      className="rounded-2xl max-h-48 bg-stone-900 object-cover shadow-sm"
                      style={{ maxWidth: '280px' }}
                    />
                    <button
                      onClick={() => removeVideo(i)}
                      className="absolute top-2 right-2 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Non-image file chips */}
            {otherFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {otherFiles.map(f => (
                  <div
                    key={f.idx}
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
                    <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">
                      {formatSize((f.blob as File).size ?? 0)}
                    </span>
                    <button
                      onClick={() => removeFile(f.idx)}
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

            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-stone-800 dark:text-stone-100 text-[18px] leading-[1.8] placeholder-stone-300 dark:placeholder-stone-600 overflow-hidden"
              style={{ fontFamily: 'inherit', minHeight: '55vh' }}
            />

          </div>
        </div>

        {/* Toolbar */}
        <div className="shrink-0 border-t border-stone-200/50 dark:border-stone-700/50 px-6 py-3.5">
          <div className="max-w-2xl mx-auto flex items-center gap-2">

            {/* Video button */}
            <button
              onClick={onOpenRecorder}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                videoBlobs.length > 0
                  ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/60'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 3.5A1.5 1.5 0 011.5 2h10A1.5 1.5 0 0113 3.5v2.695l1.721-1.333A.5.5 0 0116 5.195v5.61a.5.5 0 01-.779.414L13 9.82V12.5A1.5 1.5 0 0111.5 14h-10A1.5 1.5 0 010 12.5v-9z"/>
              </svg>
              {videoBlobs.length > 0 ? `Add video · ${videoBlobs.length}` : 'Add video'}
            </button>

            {/* Attach file button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                totalFiles > 0
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 8.5L7.5 14.5a4 4 0 01-5.657-5.657l7.07-7.07a2.5 2.5 0 013.536 3.536L5.378 12.38a1 1 0 01-1.414-1.414l6.364-6.364"/>
              </svg>
              {totalFiles > 0 ? `Attach · ${totalFiles}` : 'Attach'}
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
              <button
                onClick={onSave}
                disabled={!canSave || saving}
                className="flex items-center gap-1.5 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-[13px] font-semibold px-4 py-2 rounded-full hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-25 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                {saving ? 'Saving…' : 'Save'}
                {!saving && <span className="text-white/40 dark:text-stone-900/40 text-[11px]">⌘↵</span>}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showRecorder && (
        <VideoRecorder
          onAccept={addVideo}
          onClose={onCloseRecorder}
        />
      )}
    </>
  );
}
