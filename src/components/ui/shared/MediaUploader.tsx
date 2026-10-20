import React, { useEffect, useRef, useState } from 'react';
import { Film, ImageIcon, Loader2, Plus, RotateCcw, UploadCloud, X, AlertTriangle } from 'lucide-react';
import { incidentService } from '../../../services/incidentService';

export interface MediaItem {
  key: string;
  name: string;
  kind: 'image' | 'video';
  status: 'uploading' | 'uploaded' | 'failed';
  ref?: string;
  error?: string;
  file?: File;
  /** Local object URL for the thumbnail; kept after upload. */
  preview?: string;
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
  /** Signed URLs for saved attachments, keyed by ref, so they show as thumbnails. */
  existingPreviews?: Record<string, { url: string; kind: 'image' | 'video' | string }>;
  onRemoveExisting?: (ref: string) => void;
  disabled?: boolean;
}

/** One square thumbnail: image or video still, a status overlay, remove on hover. */
const Thumb: React.FC<{
  url?: string;
  kind: string;
  name: string;
  status?: MediaItem['status'];
  error?: string;
  onRemove?: () => void;
  onRetry?: () => void;
}> = ({ url, kind, name, status, error, onRemove, onRetry }) => (
  <li className="group relative aspect-square rounded-lg overflow-hidden bg-slate-100 ring-1 ring-slate-200" title={error ?? name}>
    {url ? (
      kind === 'video'
        ? <video src={url} muted preload="metadata" className="w-full h-full object-cover" />
        : <img src={url} alt={name} className="w-full h-full object-cover" />
    ) : (
      <span className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 px-1">
        {kind === 'video' ? <Film size={18} /> : <ImageIcon size={18} />}
        <span className="text-[10px] truncate max-w-full">{name}</span>
      </span>
    )}
    {kind === 'video' && url && (
      <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-slate-900/70 text-white"><Film size={10} /></span>
    )}
    {status === 'uploading' && (
      <span className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-blue-600" /></span>
    )}
    {status === 'failed' && (
      <span className="absolute inset-0 bg-red-50/95 flex flex-col items-center justify-center gap-1 text-red-700 p-1 text-center">
        <AlertTriangle size={15} />
        <span className="text-[10px] font-semibold leading-tight line-clamp-2">{error ?? 'Failed'}</span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="text-[10px] font-semibold underline flex items-center gap-0.5 cursor-pointer">
            <RotateCcw size={10} /> Retry
          </button>
        )}
      </span>
    )}
    {onRemove && (
      <button type="button" aria-label={`Remove ${name}`} onClick={onRemove}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer">
        <X size={12} />
      </button>
    )}
  </li>
);

/**
 * Uploads each file immediately to private incident storage through the
 * backend. Empty: a drop zone. With files: a thumbnail grid ending in an
 * "Add" tile. Failures show on their tile and never block saving the facts;
 * only successfully uploaded references are saved.
 */
export const MediaUploader: React.FC<MediaUploaderProps> = ({ items, onChange, existingRefs = [], existingPreviews = {}, onRemoveExisting, disabled }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const total = existingRefs.length + items.length;
  const full = total >= MAX_ATTACHMENTS;

  // Free local previews when the form unmounts.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((m) => m.preview && URL.revokeObjectURL(m.preview)), []);

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
        accepted.push({ key, name: file.name, kind, status: 'failed', error: `Limit of ${MAX_ATTACHMENTS} reached` });
        return;
      }
      const problem = precheck(file);
      accepted.push(problem
        ? { key, name: file.name, kind, status: 'failed', error: problem }
        : { key, name: file.name, kind, status: 'uploading', file, preview: URL.createObjectURL(file) });
    });
    onChange((prev) => [...prev, ...accepted]);
    accepted.filter((m) => m.status === 'uploading').forEach((m) => void upload(m));
  };

  const remove = (m: MediaItem) => {
    if (m.preview) URL.revokeObjectURL(m.preview);
    onChange((prev) => prev.filter((x) => x.key !== m.key));
  };

  const browse = () => inputRef.current?.click();
  const dropProps = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); if (!disabled) addFiles(e.dataTransfer.files); },
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">
          Photos and Videos <span className="font-normal text-slate-400 ml-1">(optional)</span>
        </span>
        {total > 0 && <span className="text-[11px] text-slate-400 tabular-nums">{total} of {MAX_ATTACHMENTS}</span>}
      </div>
      <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

      {total === 0 ? (
        <button
          type="button"
          disabled={disabled}
          onClick={browse}
          {...dropProps}
          className={`w-full rounded-xl border border-dashed px-4 py-5 flex flex-col items-center gap-1.5 text-center transition-colors cursor-pointer disabled:opacity-50
            ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40'}`}
        >
          <UploadCloud size={20} className={dragOver ? 'text-blue-600' : 'text-slate-400'} />
          <span className="text-xs text-slate-600"><span className="font-semibold text-blue-700">Choose files</span> or drop them here</span>
          <span className="text-[11px] text-slate-400">Images up to 10 MB · videos up to 50 MB</span>
        </button>
      ) : (
        <ul {...dropProps}
          className={`grid grid-cols-4 sm:grid-cols-6 gap-2 rounded-xl p-1 -m-1 transition-colors ${dragOver ? 'bg-blue-50 ring-1 ring-blue-300' : ''}`}>
          {existingRefs.map((ref) => {
            const pv = existingPreviews[ref];
            return (
              <Thumb key={ref} url={pv?.url} kind={pv?.kind ?? 'image'} name="Saved attachment"
                onRemove={onRemoveExisting ? () => onRemoveExisting(ref) : undefined} />
            );
          })}
          {items.map((m) => (
            <Thumb key={m.key} url={m.preview} kind={m.kind} name={m.name} status={m.status} error={m.error}
              onRemove={() => remove(m)} onRetry={m.file ? () => void upload(m) : undefined} />
          ))}
          {!full && (
            <li>
              <button type="button" disabled={disabled} onClick={browse} aria-label="Add another photo or video"
                className="w-full aspect-square rounded-lg border border-dashed border-slate-300 text-slate-400 hover:text-blue-700 hover:border-blue-400 hover:bg-blue-50/50 flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:opacity-50">
                <Plus size={18} />
                <span className="text-[10px] font-semibold">Add</span>
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export const uploadedRefs = (items: MediaItem[]) => items.filter((m) => m.status === 'uploaded' && m.ref).map((m) => m.ref as string);
export const hasPendingUploads = (items: MediaItem[]) => items.some((m) => m.status === 'uploading');
