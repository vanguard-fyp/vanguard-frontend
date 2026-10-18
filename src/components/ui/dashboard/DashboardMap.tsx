import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Incident } from '../../../types';
import { DASH, sevTone } from '../../../constants/dashboard';

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
  // Latest click handler, read at click time, so a new function from the parent
  // never forces the map to be torn down and rebuilt.
  const onSelectRef = useRef(onSelectIncident);
  onSelectRef.current = onSelectIncident;

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

    activeIncidents.forEach((inc) => {
      // Quiet markers: Critical in red, everything else in grey steps.
      // Every active marker pulses so it reads as live; Critical pulses harder.
      const tone = sevTone(inc.severity);
      const critical = inc.severity === 'Critical';
      const size = critical ? 16 : 13;
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `<div style="position:relative;width:${size}px;height:${size}px;">
            <span class="dash-map-ping" style="background:${tone};animation-duration:${critical ? 1.4 : 2.2}s;opacity:${critical ? 0.55 : 0.4};"></span>
            <div data-incident="${inc.id}" style="
              position:relative;width:${size}px;height:${size}px;border-radius:50%;
              background:${tone};border:2.5px solid #fff;
              box-shadow:0 1px 4px rgba(15,23,42,.3);cursor:pointer;
              transition:box-shadow .2s;"></div>
          </div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });

      const marker = L.marker(inc.coordinates, { icon: customIcon }).addTo(map);

      // Marker click event
      marker.on('click', () => {
        onSelectRef.current(inc);
      });

      // Simple popup
      marker.bindTooltip(`
        <div style="font-family: Inter, sans-serif; font-size: 12px; padding: 2px;">
          <strong style="color: #0f172a; font-weight: 600;">${inc.title}</strong><br/>
          <span style="color: #64748b;">${inc.district} · click to open</span>
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
  }, [incidents]);

  // Pan to selected incident when changed, and ring its marker in blue.
  useEffect(() => {
    document.querySelectorAll<HTMLElement>('.custom-leaflet-marker [data-incident]').forEach((el) => {
      el.style.boxShadow = el.dataset.incident === selectedIncident?.id
        ? `0 0 0 3px ${DASH.blue}, 0 1px 4px rgba(15,23,42,.3)`
        : '0 1px 4px rgba(15,23,42,.3)';
    });
    if (selectedIncident && leafletMapRef.current) {
      leafletMapRef.current.flyTo(selectedIncident.coordinates, 9, {
        duration: 1.2,
      });
    }
  }, [selectedIncident, incidents]);

  return (
    <div className="relative w-full h-full min-h-[320px] overflow-hidden rounded-b-2xl">
      <div ref={mapRef} className="absolute inset-0 z-10" />

      {/* Selected incident */}
      {selectedIncident && (
        <div className="absolute bottom-3 left-3 z-20 max-w-[min(380px,calc(100%-1.5rem))] bg-white/95 backdrop-blur-sm rounded-xl px-3.5 py-2.5 shadow-[0_6px_20px_-8px_rgba(15,23,42,.35)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: sevTone(selectedIncident.severity) }} />
            <p className="text-xs font-bold text-slate-900 truncate">{selectedIncident.title}</p>
            {selectedIncident.ai_priority_score != null && (
              <span className="text-sm font-extrabold text-slate-900 font-mono shrink-0 ml-2" title="AI priority">{selectedIncident.ai_priority_score}</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate pl-[18px] mt-0.5">{selectedIncident.severity} · {selectedIncident.district}</p>
        </div>
      )}
    </div>
  );
};
