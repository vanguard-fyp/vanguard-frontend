import React, { useState } from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';
import type { MatrixRow } from '../../../types';

import { permOptions, userRolesList as rolesList } from '../../../constants';

const initialMatrix: MatrixRow[] = [
  { module: 'Dashboard (Command Center)', officer: 'Full Access', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'Incident Management', officer: 'Verify & Manage', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'Disaster Intelligence & GIS Map', officer: 'Full Access', coordinator: 'Full Access', manager: 'View Only', admin: 'Full Access' },
  { module: 'Rescue Operations & Missions', officer: 'View Only', coordinator: 'Assign & Track', manager: 'View Only', admin: 'Full Access' },
  { module: 'Resource Inventory & Requests', officer: 'Request Only', coordinator: 'Request Only', manager: 'Approve & Allocate', admin: 'Full Access' },
  { module: 'Public Alerts & Evacuation Orders', officer: 'Broadcast Access', coordinator: 'No Access', manager: 'No Access', admin: 'Full Access' },
  { module: 'Reports & Export Analytics', officer: 'Full Access', coordinator: 'View Only', manager: 'View Only', admin: 'Full Access' },
  { module: 'System Admin & User Control', officer: 'No Access', coordinator: 'No Access', manager: 'No Access', admin: 'Full Access' },
];

export const RolesPermissionsMatrix: React.FC = () => {
  const [matrix, setMatrix] = useState<MatrixRow[]>(initialMatrix);
  const [savedNotice, setSavedNotice] = useState(false);

  const handlePermChange = (moduleIndex: number, roleKey: 'officer' | 'coordinator' | 'manager' | 'admin', newValue: string) => {
    setMatrix((prev) =>
      prev.map((row, i) => (i === moduleIndex ? { ...row, [roleKey]: newValue } : row))
    );
  };

  const handleSaveMatrix = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs space-y-0">
      {/* Header */}
      <div className="px-5 py-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800">Operational Role Permissions Matrix (RBAC)</h3>
        </div>

        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 size={13} /> Saved Matrix Changes
            </span>
          )}
          <button
            onClick={handleSaveMatrix}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Save RBAC Configuration
          </button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wide text-left">
              <th className="px-5 py-3">Module / System Capability</th>
              {rolesList.map((role) => (
                <th key={role} className="px-4 py-3 text-slate-800 font-bold">
                  {role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {matrix.map((row, idx) => (
              <tr key={row.module} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 text-xs font-bold text-slate-900">{row.module}</td>
                {(['officer', 'coordinator', 'manager', 'admin'] as const).map((roleKey) => {
                  const perm = row[roleKey];
                  return (
                    <td key={roleKey} className="px-4 py-3.5">
                      <select
                        value={perm}
                        onChange={(e) => handlePermChange(idx, roleKey, e.target.value)}
                        className={`text-[11px] font-bold px-2 py-1 rounded border focus:outline-none cursor-pointer ${
                          perm === 'Full Access' ||
                          perm === 'Verify & Manage' ||
                          perm === 'Assign & Track' ||
                          perm === 'Approve & Allocate' ||
                          perm === 'Broadcast Access'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : perm === 'View Only' || perm === 'Request Only'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {permOptions.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
