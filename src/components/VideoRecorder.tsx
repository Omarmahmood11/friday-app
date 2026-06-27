import { useState, useRef, useEffect } from 'react';

interface Props {
  onAccept: (blob: Blob) => void;
  onClose: () => void;
}

type State = 'requesting' | 'ready' | 'recording' | 'reviewing';

function getBestMimeType(): string {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
}

function fmtTime(s: number) {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

export default function VideoRecorder({ onAccept, onClose }: Props) {
  const [state, setState] = useState<State>('requesting');
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    openCamera();
    return () => stopAll();
  }, []);

  const stopAll = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  };

  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      setState('ready');
    } catch {
      setError('Camera access denied. Please allow camera & microphone permissions.');
      setState('ready');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mimeType = getBestMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      blobRef.current = blob;
      streamRef.current?.getTracks().forEach(t => t.stop());

      const url = URL.createObjectURL(blob);
      previewUrlRef.current = url;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
        videoRef.current.controls = true;
      }
      setState('reviewing');
    };

    recorder.start(100);
    setState('recording');
    setElapsed(0);
    timerRef.current = window.setInterval(() => setElapsed(p => p + 1), 1000);
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  };

  const handleRetry = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    blobRef.current = null;
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.muted = true;
      videoRef.current.controls = false;
    }
    setElapsed(0);
    setState('requesting');
    openCamera();
  };

  const handleUse = () => {
    if (blobRef.current) onAccept(blobRef.current);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl">
        {/* Handle bar on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-stone-200 rounded-full"/>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-800">
            {state === 'reviewing' ? 'Review clip' : state === 'recording' ? 'Recording' : 'Record video'}
          </p>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="#78716C" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Video area */}
        <div className="relative bg-stone-950 aspect-video">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-8 text-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-stone-500">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p className="text-stone-400 text-sm">{error}</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {state === 'recording' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"/>
              {fmtTime(elapsed)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="px-5 py-5">
          {state === 'requesting' && (
            <div className="flex justify-center py-1">
              <p className="text-stone-400 text-sm">Accessing camera…</p>
            </div>
          )}

          {state === 'ready' && !error && (
            <div className="flex justify-center">
              <button
                onClick={startRecording}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                <span className="w-2.5 h-2.5 bg-white rounded-full"/>
                Start recording
              </button>
            </div>
          )}

          {state === 'recording' && (
            <div className="flex justify-center">
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-stone-900 hover:bg-stone-700 active:scale-95 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all"
              >
                <span className="w-3 h-3 bg-white rounded-sm"/>
                Stop
              </button>
            </div>
          )}

          {state === 'reviewing' && (
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="flex-1 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 text-sm font-medium py-2.5 rounded-full transition-all"
              >
                Re-record
              </button>
              <button
                onClick={handleUse}
                className="flex-1 bg-stone-900 hover:bg-stone-700 active:scale-95 text-white text-sm font-semibold py-2.5 rounded-full transition-all"
              >
                Use this
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
