import { useState, useRef, useEffect, useCallback } from 'react';
import VideoRecorder from './VideoRecorder';

const isElectron = navigator.userAgent.includes('Electron');

interface Props {
  onSave: (text: string, videoBlob: Blob | null) => Promise<void>;
  onClose: () => void;
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export default function EntryEditor({ onSave, onClose }: Props) {
  const [text, setText] = useState('');
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevPreviewUrl = useRef<string | null>(null);

  // Auto-focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Manage preview URL lifecycle
  useEffect(() => {
    if (prevPreviewUrl.current) {
      URL.revokeObjectURL(prevPreviewUrl.current);
      prevPreviewUrl.current = null;
    }
    if (videoBlob) {
      const url = URL.createObjectURL(videoBlob);
      prevPreviewUrl.current = url;
      setVideoPreviewUrl(url);
    } else {
      setVideoPreviewUrl(null);
    }
  }, [videoBlob]);

  useEffect(() => {
    return () => {
      if (prevPreviewUrl.current) URL.revokeObjectURL(prevPreviewUrl.current);
    };
  }, []);

  // Auto-grow textarea
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const handleSave = async () => {
    if (!text.trim() && !videoBlob) return;
    setSaving(true);
    try {
      await onSave(text, videoBlob);
    } finally {
      setSaving(false);
    }
  };

  // Cmd+Enter or Ctrl+Enter to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const canSave = text.trim().length > 0 || videoBlob !== null;
  const words = wordCount(text);

  return (
    <>
      <div className="fixed inset-0 z-20 bg-[#F8F6F2] flex flex-col animate-fadeIn">
        {/* Header */}
        <header
          className="flex items-center justify-between py-4 border-b border-stone-200/50 shrink-0"
          style={{
            paddingLeft: isElectron ? '84px' : '20px',
            paddingRight: '20px',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 transition-colors text-sm"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11.5L3.5 7 9 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          <p className="text-[11.5px] text-stone-400 font-medium">{todayLabel()}</p>

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="text-sm font-semibold px-4 py-1.5 rounded-full transition-all bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </header>

        {/* Writing area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-xl mx-auto px-6 pt-7 pb-4">
            {/* Recorded video preview */}
            {videoPreviewUrl && (
              <div className="relative mb-5">
                <video
                  src={videoPreviewUrl}
                  controls
                  playsInline
                  className="w-full rounded-2xl max-h-60 bg-stone-900 object-cover shadow-sm"
                />
                <button
                  onClick={() => setVideoBlob(null)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="What's on your mind…"
              rows={1}
              className="w-full bg-transparent resize-none outline-none text-stone-800 text-[17px] leading-[1.75] placeholder-stone-300 overflow-hidden"
              style={{ fontFamily: 'inherit', minHeight: '52vh' }}
            />
          </div>
        </div>

        {/* Bottom toolbar */}
        <div className="shrink-0 border-t border-stone-200/50 px-5 py-3.5">
          <div className="max-w-xl mx-auto flex items-center gap-2">
            <button
              onClick={() => setShowRecorder(true)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium transition-all active:scale-95 ${
                videoBlob
                  ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 3.5A1.5 1.5 0 011.5 2h10A1.5 1.5 0 0113 3.5v2.695l1.721-1.333A.5.5 0 0116 5.195v5.61a.5.5 0 01-.779.414L13 9.82V12.5A1.5 1.5 0 0111.5 14h-10A1.5 1.5 0 010 12.5v-9z"/>
              </svg>
              {videoBlob ? 'Re-record' : 'Record video'}
            </button>

            <span className="ml-auto text-[11px] text-stone-300 tabular-nums">
              {words > 0 ? `${words} ${words === 1 ? 'word' : 'words'}` : ''}
            </span>

            <span className="text-[11px] text-stone-300 hidden sm:block">
              ⌘↵ to save
            </span>
          </div>
        </div>
      </div>

      {showRecorder && (
        <VideoRecorder
          onAccept={blob => { setVideoBlob(blob); setShowRecorder(false); }}
          onClose={() => setShowRecorder(false)}
        />
      )}
    </>
  );
}
