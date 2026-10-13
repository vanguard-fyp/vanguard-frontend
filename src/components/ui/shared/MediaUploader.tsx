import React, { useRef, useState } from 'react';
import { Film, ImageIcon, Loader2, RotateCcw, Upload, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { incidentService } from '../../../services/incidentService';

export interface MediaItem {
  key: string;
  name: string;
  kind: 'image' | 'video';
  status: 'uploading' | 'uploaded' | 'failed';
  ref?: string;
  error?: string;
  file?: File;
}

const ACCEPT = 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm';
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

/** Client-side pre-check (the server re-validates type by content and size). */
export function precheck(file: File): string | null {
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) return 'Unsupported file type.';
  if (!ACCEPT.split(',').includes(file.type)) return 'Allowed: JPEG, PNG, WebP, MP4, MOV, WebM.';
  if (isImage && file.size > MAX_IMAGE) return 'Images must be 10 MB or smaller.';
  if (isVideo && file.size > MAX_VIDEO) return 'Videos must be 50 MB or smaller.';
  return null;
}

interface MediaUploaderProps {
  items: MediaItem[];
  onChange: (updater: (prev: MediaItem[]) => MediaItem[]) => void;
  existingRefs?: string[];
  onRemoveExisting?: (ref: string) => void;
  disabled?: boolean;
}

/**
 * Uploads each file immediately to private incident storage through the
 * backend. Upload failures are shown per file and never block saving the
 * incident's facts; only successfully uploaded references are saved.
 */
export const MediaUploader: React.FC<MediaUploaderProps> = ({ items, onChange, existingRefs = [], onRemoveExisting, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const upload = async (item: MediaItem) => {
    if (!item.file) return;
    onChange((prev) => prev.map((m) => (m.key === item.key ? { ...m, status: 'uploading', error: undefined } : m)));
    try {
      const res = await incidentService.uploadMedia(item.file);
      onChange((prev) => prev.map((m) => (m.key === item.key ? { ...m, status: 'uploaded', ref: res.ref, file: undefined } : m)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      onChange((prev) => prev.map((m) => (m.key === item.key ? { ...m, status: 'failed', error: msg } : m)));
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const room = MAX_ATTACHMENTS - existingRefs.length - items.length;
    const accepted: MediaItem[] = [];
    Array.from(files).forEach((file, i) => {
      const key = `${Date.now()}-${i}-${file.name}`;
      const kind: 'image' | 'video' = file.type.startsWith('video/') ? 'video' : 'image';
      if (accepted.length >= room) {
        accepted.push({ key, name: file.name, kind, status: 'failed', error: `Limit of ${MAX_ATTACHMENTS} attachments reached.` });
        return;
      }
      const problem = precheck(file);
      accepted.push(problem ? { key, name: file.name, kind, status: 'failed', error: problem } : { key, name: file.name, kind, status: 'uploading', file });
    });
    onChange((prev) => [...prev, ...accepted]);
    accepted.filter((m) => m.status === 'uploading').forEach((m) => void upload(m));
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-800">Photos / videos <span className="text-[10px] text-slate-500 font-normal">(optional)</span></label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (!disabled) addFiles(e.dataTransfer.files); }}
        className={`rounded-lg border border-dashed px-3 py-3 text-xs flex items-center justify-between gap-2 ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}
      >
        <span className="text-slate-500">JPEG/PNG/WebP up to 10 MB · MP4/MOV/WebM up to 50 MB</span>
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-300 font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer disabled:opacity-50">
          <Upload size={12} /> Add files
        </button>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {(existingRefs.length > 0 || items.length > 0) && (
        <ul className="space-y-1">
          {existingRefs.map((ref) => (
            <li key={ref} className="flex items-center gap-2 text-[11px] text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1">
              <CheckCircle2 size={12} className="text-emerald-600" />
              <span className="truncate flex-1">{ref.startsWith('storage://') ? `Saved attachment …${ref.slice(-12)}` : ref.startsWith('data:') ? 'Legacy inline image (not viewable)' : ref}</span>
              {onRemoveExisting && (
                <button type="button" aria-label="Remove attachment" onClick={() => onRemoveExisting(ref)} className="text-slate-400 hover:text-red-600 cursor-pointer"><X size={12} /></button>
              )}
            </li>
          ))}
          {items.map((m) => (
            <li key={m.key} className={`flex items-center gap-2 text-[11px] rounded-md px-2 py-1 border ${m.status === 'failed' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-slate-200 text-slate-700'}`}>
              {m.kind === 'video' ? <Film size={12} /> : <ImageIcon size={12} />}
              <span className="truncate flex-1">{m.name}</span>
              {m.status === 'uploading' && <span className="flex items-center gap-1 text-slate-500"><Loader2 size={11} className="animate-spin" /> Uploading</span>}
              {m.status === 'uploaded' && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 size={11} /> Uploaded</span>}
              {m.status === 'failed' && (
                <span className="flex items-center gap-1"><AlertTriangle size={11} /> {m.error}
                  {m.file && (
                    <button type="button" onClick={() => void upload(m)} className="ml-1 underline flex items-center gap-0.5 cursor-pointer"><RotateCcw size={10} /> Retry</button>
                  )}
                </span>
              )}
              <button type="button" aria-label="Remove file" onClick={() => onChange((prev) => prev.filter((x) => x.key !== m.key))} className="text-slate-400 hover:text-red-600 cursor-pointer"><X size={12} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const uploadedRefs = (items: MediaItem[]) => items.filter((m) => m.status === 'uploaded' && m.ref).map((m) => m.ref as string);
export const hasPendingUploads = (items: MediaItem[]) => items.some((m) => m.status === 'uploading');
