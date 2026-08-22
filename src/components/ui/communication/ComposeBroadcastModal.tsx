import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Megaphone, Smartphone, Globe, Tv } from 'lucide-react';
import type { PublicAnnouncement, SeverityLevel } from '../../../types';
import { availableChannels } from '../../../constants';

interface ComposeBroadcastModalProps {
  onClose: () => void;
  onPublish: (announcement: Partial<PublicAnnouncement>) => void;
}

const categories: PublicAnnouncement['category'][] = [
  'Emergency Alert',
  'Evacuation Order',
  'Safety Announcement',
];

const channelIcons: Record<string, React.ReactNode> = {
  'SMS Broadcast': <Smartphone size={13} />,
  'MyJPJ App': <Globe size={13} />,
  'NADMA Portal': <Globe size={13} />,
  'TV/Radio Alert': <Tv size={13} />,
};

export const ComposeBroadcastModal: React.FC<ComposeBroadcastModalProps> = ({
  onClose,
  onPublish,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PublicAnnouncement['category']>('Emergency Alert');
  const [severity, setSeverity] = useState<SeverityLevel>('High');
  const [targetState, setTargetState] = useState('Kelantan');
  const [targetDistricts, setTargetDistricts] = useState('Kota Bharu, Pasir Mas');
  const [content, setContent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'SMS Broadcast',
    'MyJPJ App',
    'NADMA Portal',
  ]);

  const toggleChannel = (ch: string) => {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    onPublish({
      title,
      category,
      severity,
      targetState,
      targetDistricts: targetDistricts.split(',').map((d) => d.trim()),
      content,
      channels: selectedChannels as PublicAnnouncement['channels'],
      issuedBy: 'Director General of NADMA Malaysia',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Megaphone size={18} />
            <h3 className="text-sm font-bold">Broadcast Public Communication</h3>
          </div>
          <button
            onClick={onClose}
            className="text-blue-100 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Broadcast Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. MANDATORY EVACUATION ORDER FOR KOTA BHARU FLOOD ZONES"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          {/* Category & Severity Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Notice Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as PublicAnnouncement['category'])}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Severity Level
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityLevel)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              >
                {(['Critical', 'High', 'Medium', 'Low'] as SeverityLevel[]).map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Location Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Target State
              </label>
              <input
                type="text"
                value={targetState}
                onChange={(e) => setTargetState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                Target Districts
              </label>
              <input
                type="text"
                value={targetDistricts}
                onChange={(e) => setTargetDistricts(e.target.value)}
                placeholder="Comma separated districts"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
              Broadcast Message Content *
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter full public emergency announcement text..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-600 resize-none transition-colors"
            />
          </div>

          {/* Channels Selection */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
              Distribution Channels
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableChannels.map((ch) => {
                const isSelected = selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-800 border-blue-300 shadow-2xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {channelIcons[ch]}
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Send size={13} />
              Publish Broadcast
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
