// ─── Resource Management Constants ───────────────────────────────────────────

export const lifecycleSteps = ['Requested', 'Approved', 'Dispatched', 'Delivered'];

export const warehouseLocationContext: Record<string, { fullAddress: string; nearDisaster: string }> = {
  'NADMA Central Depot Subang': {
    fullAddress: 'Subang Logistics Complex, Selangor',
    nearDisaster: 'Selangor Sector (Near Hulu Langat Landslide Zone)',
  },
  'APM Regional Logistics Kuantan': {
    fullAddress: 'APM Logistics Base, Indera Mahkota, Kuantan, Pahang',
    nearDisaster: 'Pahang Sector (Near Kuantan & Rompin Flood Basin)',
  },
  'BOMBA Regional Base Machang': {
    fullAddress: 'BOMBA Tactical Station, Machang, Kelantan',
    nearDisaster: 'Kelantan Sector (Direct Access to Sg. Kelantan Overflow)',
  },
  'Ministry of Health Depot Sepang': {
    fullAddress: 'KKM Central Medical Logistics, Sepang, Selangor',
    nearDisaster: 'Central Disaster Medical Supply Corridor',
  },
  'JKM Warehouse Kota Bharu': {
    fullAddress: 'JKM Disaster Relief Depot, Pengkalan Chepa, Kota Bharu',
    nearDisaster: 'Kelantan Ground Zero (Sungai Kelantan Evacuation Hub)',
  },
};

export function getWarehouseContext(warehouse: string): { fullAddress: string; nearDisaster: string } {
  return (
    warehouseLocationContext[warehouse] || {
      fullAddress: warehouse,
      nearDisaster: 'Strategic Disaster Relief Depot',
    }
  );
}

