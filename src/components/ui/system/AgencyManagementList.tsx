import React, { useState } from 'react';
import { Building2, Plus, Edit2, Trash2, Phone, X, Check } from 'lucide-react';

import type { AgencyItem } from '../../../types';

const initialAgencies: AgencyItem[] = [
  { id: 'AGY-01', name: 'NADMA Malaysia', type: 'Lead National Agency', contact: '03-8886 8111', status: 'Connected' },
  { id: 'AGY-02', name: 'SMART (Special Malaysia Disaster Assistance and Rescue Team)', type: 'Heavy Search & Rescue', contact: '03-8064 7777', status: 'Connected' },
  { id: 'AGY-03', name: 'APM (Civil Defence Force Malaysia)', type: 'Logistics & First Responders', contact: '03-8920 6000', status: 'Connected' },
  { id: 'AGY-04', name: 'BOMBA (Fire & Rescue Dept Malaysia)', type: 'Fire & Water Rescue', contact: '03-8888 0055', status: 'Connected' },
  { id: 'AGY-05', name: 'PDRM (Royal Malaysia Police)', type: 'Public Order & Evacuation Security', contact: '03-2266 2222', status: 'Connected' },
  { id: 'AGY-06', name: 'JKM (Social Welfare Department)', type: 'Relief Center & Food Distribution', contact: '03-8000 8000', status: 'Connected' },
  { id: 'AGY-07', name: 'KKM (Ministry of Health)', type: 'Disaster Emergency Medical Services', contact: '03-8883 3888', status: 'Connected' },
];

export const AgencyManagementList: React.FC = () => {
  const [agencies, setAgencies] = useState<AgencyItem[]>(initialAgencies);
  const [editingAgency, setEditingAgency] = useState<AgencyItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [contact, setContact] = useState('');
  const [status, setStatus] = useState<'Connected' | 'Standby' | 'Disconnected'>('Connected');

  const handleOpenAdd = () => {
    setEditingAgency(null);
    setName('');
    setType('');
    setContact('');
    setStatus('Connected');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agency: AgencyItem) => {
    setEditingAgency(agency);
    setName(agency.name);
    setType(agency.type);
    setContact(agency.contact);
    setStatus(agency.status);
    setIsModalOpen(true);
  };

  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingAgency) {
      setAgencies((prev) =>
        prev.map((a) => (a.id === editingAgency.id ? { ...a, name, type, contact, status } : a))
      );
    } else {
      const newAgency: AgencyItem = {
        id: `AGY-${0 + agencies.length + 1}`,
        name,
        type: type || 'Emergency Response Agency',
        contact: contact || '03-8000 0000',
        status,
      };
      setAgencies((prev) => [...prev, newAgency]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteAgency = (id: string) => {
    setAgencies((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Integrated Malaysian Emergency Agencies</h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full">
            {agencies.length} Agencies
          </span>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          <Plus size={14} />
          Register New Agency
        </button>
      </div>

      {/* Agency Directory List */}
      <div className="divide-y divide-slate-100">
        {agencies.map((agency) => (
          <div
            key={agency.id}
            className="px-5 py-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors flex-wrap sm:flex-nowrap gap-3"
          >
            <div>
              <h4 className="text-sm font-bold text-slate-900">{agency.name}</h4>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{agency.type}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1 font-mono flex items-center gap-1">
                <Phone size={10} /> Hotline: {agency.contact}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                  agency.status === 'Connected'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : agency.status === 'Standby'
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-slate-600 bg-slate-100 border-slate-200'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    agency.status === 'Connected' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                API Sync: {agency.status}
              </span>

              <button
                onClick={() => handleOpenEdit(agency)}
                className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                title="Configure agency details"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => handleDeleteAgency(agency.id)}
                className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Remove agency"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Agency Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingAgency ? `Edit Agency: ${editingAgency.name}` : 'Register Emergency Agency'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} className="p-6 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Agency Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. NADMA Malaysia"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Agency Scope / Description
                </label>
                <input
                  type="text"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  placeholder="e.g. Lead National Disaster Agency"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  Emergency Hotline Contact
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 03-8886 8111"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 font-mono focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block mb-1">
                  API Sync Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AgencyItem['status'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600"
                >
                  <option value="Connected">Connected (Active API Link)</option>
                  <option value="Standby">Standby (Manual Dispatch Only)</option>
                  <option value="Disconnected">Disconnected</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                >
                  <Check size={14} />
                  Save Agency
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
