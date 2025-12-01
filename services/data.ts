
import { Shipment, ShipperContact, CustomerType, CompanySize } from '../types';

// --- Mock Data Generation ---

const SHIPPERS = ['Acme Global Logistics', 'Pacific Rim Trading', 'Evergreen Exports', 'TechTronic Supply', 'FreshFoods Intl'];
const CONSIGNEES = ['Walmart DC #405', 'Target Distribution', 'Amazon Fulfillment', 'Best Buy Whse', 'Costco Logistics', 'Home Depot Hub', 'Kroger Supply', 'AutoZone DC', 'Lowes Import Ctr', 'Wayfair Gate'];
const PORTS_RECEIPT = ['Shanghai', 'Ningbo', 'Yantian', 'Singapore', 'Busan', 'Rotterdam', 'Antwerp'];
const PORTS_ARRIVAL = ['Long Beach', 'Los Angeles', 'New York/New Jersey', 'Savannah', 'Seattle', 'Houston'];
const VOCCS = [
  { code: 'MAEU', name: 'Maersk Line' },
  { code: 'MSCU', name: 'MSC' },
  { code: 'CMDU', name: 'CMA CGM' },
  { code: 'COSU', name: 'COSCO' },
  { code: 'HLCU', name: 'Hapag-Lloyd' }
];
const NVOCCS = ['Expeditors', 'Kuehne + Nagel', 'DSV', 'C.H. Robinson', 'Flexport', 'DB Schenker'];

// Lat/Lng Lookup for Demo Mapping (Mock Geocoding)
export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // Asia
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Ningbo': { lat: 29.8683, lng: 121.5440 },
  'Yantian': { lat: 22.5726, lng: 114.2675 }, // Shenzhen
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Busan': { lat: 35.1796, lng: 129.0756 },
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Ho Chi Minh': { lat: 10.8231, lng: 106.6297 },
  
  // Europe
  'Rotterdam': { lat: 51.9244, lng: 4.4777 },
  'Antwerp': { lat: 51.2194, lng: 4.4025 },
  'Hamburg': { lat: 53.5488, lng: 9.9872 },

  // US Cities (Consignees/Ports)
  'Long Beach': { lat: 33.7701, lng: -118.1937 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'New York/New Jersey': { lat: 40.7128, lng: -74.0060 },
  'Savannah': { lat: 32.0809, lng: -81.0912 },
  'Seattle': { lat: 47.6062, lng: -122.3321 },
  'Houston': { lat: 29.7604, lng: -95.3698 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Dallas': { lat: 32.7767, lng: -96.7970 },
  'Memphis': { lat: 35.1495, lng: -90.0490 },
  'Atlanta': { lat: 33.7490, lng: -84.3880 },
  'Miami': { lat: 25.7617, lng: -80.1918 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 }
};

const GLOBAL_CITIES = Object.keys(CITY_COORDINATES);

const generateMockShipments = (count: number): Shipment[] => {
  const shipments: Shipment[] = [];
  const start = new Date('2023-01-01').getTime();
  const end = new Date('2024-05-30').getTime();

  for (let i = 0; i < count; i++) {
    const randomDate = new Date(start + Math.random() * (end - start));
    const shipper = SHIPPERS[Math.floor(Math.random() * SHIPPERS.length)];
    const consignee = CONSIGNEES[Math.floor(Math.random() * CONSIGNEES.length)];
    const vocc = VOCCS[Math.floor(Math.random() * VOCCS.length)];
    
    // Pick a consignee city that exists in our coordinate list for mapping
    const usCities = ['Los Angeles', 'Chicago', 'Dallas', 'Memphis', 'Atlanta', 'Seattle', 'New York/New Jersey', 'Savannah', 'Houston'];
    const consCity = usCities[Math.floor(Math.random() * usCities.length)];

    shipments.push({
      houseBolNumber: `HBL-${Math.floor(100000 + Math.random() * 900000)}`,
      shipperName: shipper,
      consigneeName: consignee,
      consigneeCity: consCity,
      consigneeAddress: `${Math.floor(Math.random() * 9999)} Industrial Blvd`,
      notifyParty: Math.random() > 0.5 ? consignee : 'Same as Consignee',
      placeOfReceipt: PORTS_RECEIPT[Math.floor(Math.random() * PORTS_RECEIPT.length)],
      usArrivalPort: PORTS_ARRIVAL[Math.floor(Math.random() * PORTS_ARRIVAL.length)],
      arrivalDate: randomDate.toISOString().split('T')[0],
      teu: [1, 2, 2, 4, 1, 40][Math.floor(Math.random() * 6)], 
      nvoccName: NVOCCS[Math.floor(Math.random() * NVOCCS.length)],
      voccCode: vocc.code,
      voccName: vocc.name,
    });
  }
  return shipments;
};

export const INITIAL_SHIPMENTS = generateMockShipments(450);

const CUST_TYPES: CustomerType[] = ['Pvt Ltd', 'Partnership', 'Limited', 'LLP'];
const SIZES: CompanySize[] = ['SME', 'Large', 'Ultra Large'];

// Assign realistic cities to shippers for map
const SHIPPER_CITIES = ['Shanghai', 'Singapore', 'Mumbai', 'Rotterdam', 'Hamburg'];

export const INITIAL_CONTACTS: ShipperContact[] = SHIPPERS.map((name, idx) => ({
  shipperName: name,
  email: `info@${name.toLowerCase().replace(/\s/g, '')}.com`,
  contactNumber: `+1-555-${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
  address: `${Math.floor(Math.random() * 100)} Trade Zone`,
  city: SHIPPER_CITIES[idx % SHIPPER_CITIES.length], // Assign a city from our coordinate list
  panNumber: `ABCDE${Math.floor(1000 + Math.random() * 8999)}F`,
  cinNumber: `L${Math.floor(10000 + Math.random() * 90000)}MH2000PLC${Math.floor(100000 + Math.random() * 900000)}`,
  customerType: CUST_TYPES[Math.floor(Math.random() * CUST_TYPES.length)],
  companySize: SIZES[Math.floor(Math.random() * SIZES.length)],
  contactPersonName: ['John Smith', 'Sarah Chen', 'Mike Ross', 'Jessica Pearson'][Math.floor(Math.random() * 4)],
  designation: ['Logistics Manager', 'Director', 'Supply Chain Head', 'Operations Lead'][Math.floor(Math.random() * 4)],
  lastUpdated: new Date().toISOString()
}));

// --- Logic Services ---

export const getUniqueShippers = (shipments: Shipment[]): string[] => {
  return Array.from(new Set(shipments.map(s => s.shipperName))).sort();
};

export const filterShipments = (
  shipments: Shipment[],
  shipperName: string | null,
  fromDate: string,
  toDate: string
): Shipment[] => {
  return shipments.filter(s => {
    const matchesShipper = shipperName ? s.shipperName === shipperName : true;
    const matchesDate = s.arrivalDate >= fromDate && s.arrivalDate <= toDate;
    return matchesShipper && matchesDate;
  });
};

// Aggregation Helpers

export const getConsigneeStats = (data: Shipment[]) => {
  const map = new Map<string, { teu: number; count: number; city: string; address: string }>();
  
  data.forEach(s => {
    const current = map.get(s.consigneeName) || { teu: 0, count: 0, city: s.consigneeCity, address: s.consigneeAddress };
    map.set(s.consigneeName, {
      ...current,
      teu: current.teu + s.teu,
      count: current.count + 1
    });
  });

  return Array.from(map.entries())
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.teu - a.teu)
    .slice(0, 10);
};

export const getRouteStats = (data: Shipment[]) => {
  const map = new Map<string, { origin: string; dest: string; teu: number }>();

  data.forEach(s => {
    const key = `${s.placeOfReceipt}->${s.usArrivalPort}`;
    const current = map.get(key) || { origin: s.placeOfReceipt, dest: s.usArrivalPort, teu: 0 };
    map.set(key, { ...current, teu: current.teu + s.teu });
  });

  return Array.from(map.values()).sort((a, b) => b.teu - a.teu).slice(0, 8); // Top 8 flows
};

export const getCarrierStats = (data: Shipment[]) => {
  const voccMap = new Map<string, { teu: number; code: string; name: string }>();
  
  // NVOCC Map needs to track associated locations to find top ones
  const nvoccMap = new Map<string, { 
    teu: number; 
    portFreq: Map<string, number>; 
    receiptFreq: Map<string, number>;
  }>();

  data.forEach(s => {
    // VOCC Aggregation
    if (!voccMap.has(s.voccName)) {
      voccMap.set(s.voccName, { teu: 0, code: s.voccCode, name: s.voccName });
    }
    const v = voccMap.get(s.voccName)!;
    v.teu += s.teu;

    // NVOCC Aggregation
    if (!nvoccMap.has(s.nvoccName)) {
      nvoccMap.set(s.nvoccName, { teu: 0, portFreq: new Map(), receiptFreq: new Map() });
    }
    const n = nvoccMap.get(s.nvoccName)!;
    n.teu += s.teu;
    
    // Weight location frequency by TEU (or could be by count)
    n.portFreq.set(s.usArrivalPort, (n.portFreq.get(s.usArrivalPort) || 0) + s.teu);
    n.receiptFreq.set(s.placeOfReceipt, (n.receiptFreq.get(s.placeOfReceipt) || 0) + s.teu);
  });

  // Process VOCCs
  const topVOCC = Array.from(voccMap.values())
    .map(item => ({
      name: `${item.code} - ${item.name}`, // "VOCC Code - Name" format
      teu: item.teu,
      type: 'VOCC' as const
    }))
    .sort((a, b) => b.teu - a.teu)
    .slice(0, 5);

  // Process NVOCCs
  const topNVOCC = Array.from(nvoccMap.entries())
    .map(([name, stats]) => {
      // Find Top Port
      let topPort = 'N/A';
      let maxPort = -1;
      stats.portFreq.forEach((val, key) => { if (val > maxPort) { maxPort = val; topPort = key; } });

      // Find Top Receipt
      let topReceipt = 'N/A';
      let maxReceipt = -1;
      stats.receiptFreq.forEach((val, key) => { if (val > maxReceipt) { maxReceipt = val; topReceipt = key; } });

      return {
        name,
        teu: stats.teu,
        type: 'NVOCC' as const,
        topPort,
        topReceipt
      };
    })
    .sort((a, b) => b.teu - a.teu)
    .slice(0, 5);

  return { topVOCC, topNVOCC };
};

export const getVolumeTrend = (data: Shipment[]) => {
  const map = new Map<string, number>();
  
  data.forEach(s => {
    // Group by Month (YYYY-MM)
    const month = s.arrivalDate.substring(0, 7); 
    map.set(month, (map.get(month) || 0) + s.teu);
  });

  return Array.from(map.entries())
    .map(([date, teu]) => ({ date, teu }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

// --- Fuzzy Matching / Data Quality Helpers ---

// Levenshtein Distance Algo
export const getLevenshteinDistance = (a: string, b: string): number => {
  if (!a || !b) return (a || b).length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1).toLowerCase() === a.charAt(j - 1).toLowerCase()) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

// Find closest match in a list
export const findClosestMatch = (
  value: string, 
  existingValues: string[], 
  threshold: number = 3
): string | null => {
  if (!value) return null;
  
  let bestMatch = null;
  let minDistance = Infinity;

  for (const existing of existingValues) {
    if (value.toLowerCase() === existing.toLowerCase()) return existing; // Exact match (ignoring case)
    
    const dist = getLevenshteinDistance(value, existing);
    if (dist < minDistance && dist <= threshold) {
      minDistance = dist;
      bestMatch = existing;
    }
  }
  
  return bestMatch;
};
