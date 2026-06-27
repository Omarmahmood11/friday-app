import { useState, useEffect, useRef } from 'react';
import { Entry, getVideo } from '../db';
import { deriveTitle } from '../title';

interface Props {
  entry: Entry;
  onDelete: () => void;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function EntryCard({ entry, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const videoObjUrl = useRef<string | null>(null);

  const title = deriveTitle(entry.text, !!entry.videoId);
  const isLong = entry.text.length > 160;
  const preview = isLong ? entry.text.slice(0, 160).trimEnd() + '…' : entry.text;

  useEffect(() => {
    if (expanded && entry.videoId && !videoUrl) {
      setLoadingVideo(true);
      getVideo(entry.videoId).then(blob => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          videoObjUrl.current = url;
          setVideoUrl(url);
        }
        setLoadingVideo(false);
      });
    }
  }, [expanded, entry.videoId, videoUrl]);

  useEffect(() => {
    return () => {
      if (videoObjUrl.current) URL.revokeObjectURL(videoObjUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div
      className="bg-white rounded-2xl border border-stone-100 hover:border-stone-200 shadow-sm hover:shadow transition-all cursor-pointer group"
      onClick={() => setExpanded(v => !v)}
    >
      <div className="p-4 pb-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Title + time row */}
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-stone-900 text-sm font-semibold leading-tight truncate">
                {title}
              </p>
              <p className="text-[11px] text-stone-400 font-medium tabular-nums shrink-0">
                {formatTime(entry.timestamp)}
              </p>
            </div>

            {/* Text preview / full */}
            {entry.text ? (
              <p className="text-stone-500 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                {expanded ? entry.text : preview}
              </p>
            ) : (
              !expanded && entry.videoId && (
                <p className="text-stone-400 text-sm italic">Video note</p>
              )
            )}

            {/* Collapsed: video badge */}
            {!expanded && entry.videoId && (
              <div className="mt-3">
                <span className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-500 text-[11px] font-medium px-2.5 py-1 rounded-full">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 3.5A1.5 1.5 0 011.5 2h10A1.5 1.5 0 0113 3.5v2.695l1.721-1.333A.5.5 0 0116 5.195v5.61a.5.5 0 01-.779.414L13 9.82V12.5A1.5 1.5 0 0111.5 14h-10A1.5 1.5 0 010 12.5v-9z"/>
                  </svg>
                  Video
                </span>
              </div>
            )}

            {/* Expanded: video player */}
            {expanded && entry.videoId && (
              <div className="mt-4" onClick={e => e.stopPropagation()}>
                {loadingVideo ? (
                  <div className="w-full h-28 rounded-xl bg-stone-100 flex items-center justify-center">
                    <p className="text-stone-400 text-xs">Loading video…</p>
                  </div>
                ) : videoUrl ? (
                  <video
                    src={videoUrl}
                    controls
                    playsInline
                    className="w-full rounded-xl max-h-56 bg-stone-900 object-cover"
                  />
                ) : null}
              </div>
            )}

            {/* Expand hint */}
            {(isLong || entry.videoId) && (
              <p className="text-[11px] text-stone-300 mt-2">
                {expanded ? 'Click to collapse' : 'Click to expand'}
              </p>
            )}
          </div>

          {/* Menu */}
          <div
            className="relative shrink-0"
            ref={menuRef}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowMenu(v => !v)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-stone-300 hover:text-stone-600 hover:bg-stone-50 opacity-0 group-hover:opacity-100 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.3"/>
                <circle cx="8" cy="8" r="1.3"/>
                <circle cx="8" cy="13" r="1.3"/>
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-8 bg-white border border-stone-100 rounded-xl shadow-lg overflow-hidden z-20 min-w-[110px]">
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
