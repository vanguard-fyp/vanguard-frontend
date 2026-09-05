import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '../../../types';

interface DashboardMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

export const DashboardMap: React.FC<DashboardMapProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});

  useEffect(() => {
    const container = mapRef.current;
    if (!container) return;

    // Destroy existing instance if any
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }

    // Initialize real Leaflet map centered on Peninsular Malaysia
    const map = L.map(container, {
      center: [4.2105, 101.9758],
      zoom: 7,
      zoomControl: false,
      attributionControl: false,
    });

    leafletMapRef.current = map;

    // Add OpenStreetMap Tile Layer (100% free, no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom Zoom Control top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Add Incident Markers with custom HTML DivIcons (Active Unresolved Only)
    markersRef.current = {};

    const activeIncidents = incidents.filter(inc => inc.status !== 'Resolved' && inc.status !== 'Rejected');

    activeIncidents.forEach((inc, idx) => {
      const isCritical = inc.severity === 'Critical';
      const colorBg =
        inc.severity === 'Critical' ? '#dc2626' :
          inc.severity === 'High' ? '#ea580c' : '#d97706';

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
            background: ${colorBg};
            border: 2px solid #ffffff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            cursor: pointer;
          ">
            ${isCritical ? `<span style="
              position: absolute;
              inset: -6px;
              border-radius: 50%;
              background: rgba(220, 38, 38, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></span>` : ''}
            ${idx + 1}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(inc.coordinates, { icon: customIcon }).addTo(map);

      // Marker click event
      marker.on('click', () => {
        onSelectIncident(inc);
      });

      // Simple popup
      marker.bindTooltip(`
        <div style="font-family: Inter, sans-serif; font-size: 11px; padding: 2px;">
          <strong style="color: #0f172a;">${inc.title}</strong><br/>
          <span style="color: #64748b;">📍 ${inc.location}</span>
        </div>
      `, { direction: 'top', offset: [0, -12] });

      markersRef.current[inc.id] = marker;
    });

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [incidents, onSelectIncident]);

  // Pan to selected incident when changed
  useEffect(() => {
    if (selectedIncident && leafletMapRef.current) {
      leafletMapRef.current.flyTo(selectedIncident.coordinates, 9, {
        duration: 1.2,
      });
    }
  }, [selectedIncident]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col h-[540px] w-full relative">
      {/* Map Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          {/* <MapPin size={16} className="text-blue-600" /> */}
          {/* <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Live Leaflet GIS Spatial Map (Light Tile Stream)
          </h3> */}
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>OpenStreetMap Active</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative flex-1 w-full h-full">
        <div ref={mapRef} className="w-full h-full z-10" />

        {/* Selected Incident Banner */}
        {selectedIncident && (
          <div className="absolute bottom-4 left-4 right-4 bg-white/95 border border-slate-200 backdrop-blur-md rounded-xl p-3.5 shadow-xl z-20 flex items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-800 uppercase border border-red-200">
                  {selectedIncident.severity}
                </span>
                <span className="text-xs font-mono text-slate-500 font-bold">
                  {selectedIncident.displayId || (selectedIncident.id.length > 15 ? `INC-${selectedIncident.id.slice(0, 8).toUpperCase()}` : selectedIncident.id)}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 mt-1 truncate">{selectedIncident.title}</p>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">{selectedIncident.description}</p>
            </div>
            <div className="text-right shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <p className="text-base font-extrabold text-blue-700 font-mono">{selectedIncident.aiPriorityScore}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase font-mono">AI Urgency</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600 z-20 font-mono">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Critical</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> High</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Medium</span>
        </div>
        <span className="text-[10px] text-slate-400">Click marker to inspect telemetry</span>
      </div>
    </div>
  );
};
