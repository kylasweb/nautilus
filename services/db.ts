
import { Pool } from '@neondatabase/serverless';
import { Shipment, ShipperContact } from '../types';

// Connection string for direct browser access (Preview Mode)
const NEON_DB_URL = 'postgresql://neondb_owner:npg_wa2HK5vrNZOB@ep-wild-unit-a1slxcza-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  if (contentType && contentType.indexOf("application/json") !== -1) {
    return response.json();
  } else {
    // If we got HTML (like a 404 page) or text, treat as error to trigger fallback
    throw new Error("Invalid response format (not JSON)");
  }
};

const mapShipmentFromDb = (row: any): Shipment => ({
  houseBolNumber: row.house_bol_number,
  shipperName: row.shipper_name,
  consigneeName: row.consignee_name,
  consigneeCity: row.consignee_city,
  consigneeAddress: row.consignee_address,
  notifyParty: row.notify_party,
  placeOfReceipt: row.place_of_receipt,
  usArrivalPort: row.us_arrival_port,
  arrivalDate: new Date(row.arrival_date).toISOString().split('T')[0],
  teu: Number(row.teu),
  nvoccName: row.nvocc_name,
  voccCode: row.vocc_code,
  voccName: row.vocc_name
});

const mapContactFromDb = (row: any): ShipperContact => ({
  shipperName: row.shipper_name,
  email: row.email || '',
  contactNumber: row.contact_number || '',
  address: row.address || '',
  city: row.city || '',
  latitude: row.latitude ? Number(row.latitude) : undefined,
  longitude: row.longitude ? Number(row.longitude) : undefined,
  panNumber: row.pan_number || '',
  cinNumber: row.cin_number || '',
  customerType: row.customer_type || '',
  companySize: row.company_size || '',
  contactPersonName: row.contact_person_name || '',
  designation: row.designation || '',
  lastUpdated: row.last_updated
});

// --- Direct DB Helpers ---

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS shipments (
    house_bol_number TEXT PRIMARY KEY,
    shipper_name TEXT NOT NULL,
    consignee_name TEXT NOT NULL,
    consignee_city TEXT,
    consignee_address TEXT,
    notify_party TEXT,
    place_of_receipt TEXT NOT NULL,
    us_arrival_port TEXT NOT NULL,
    arrival_date DATE NOT NULL,
    teu DECIMAL(10, 2) NOT NULL,
    nvocc_name TEXT,
    vocc_code TEXT,
    vocc_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS shipper_contacts (
    shipper_name TEXT PRIMARY KEY,
    email TEXT,
    contact_number TEXT,
    address TEXT,
    city TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    pan_number TEXT,
    cin_number TEXT,
    customer_type TEXT,
    company_size TEXT,
    contact_person_name TEXT,
    designation TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
`;

const initDB = async (pool: Pool) => {
    try {
        await (pool as any).query(CREATE_TABLES_SQL);
        return true;
    } catch (e) {
        console.error("Failed to init tables", e);
        return false;
    }
};

const fetchShipmentsDirect = async (): Promise<Shipment[]> => {
  const pool = new (Pool as any)({ connectionString: NEON_DB_URL });
  try {
    const result = await (pool as any).query('SELECT * FROM shipments ORDER BY arrival_date DESC LIMIT 1000');
    return (result as any).rows.map(mapShipmentFromDb);
  } finally {
    await (pool as any).end();
  }
};

const fetchContactsDirect = async (): Promise<ShipperContact[]> => {
  const pool = new (Pool as any)({ connectionString: NEON_DB_URL });
  try {
    const result = await (pool as any).query('SELECT * FROM shipper_contacts');
    return (result as any).rows.map(mapContactFromDb);
  } finally {
    await (pool as any).end();
  }
};

const seedDatabaseDirect = async () => {
    // We can't import the seed logic directly because it resides in api/seed.ts
    // In a browser context, we rely on the API to seed. 
    // If the API is unreachable (dev mode without local server), we can't seed automatically.
    // However, if we really need client-side seeding, we would need to duplicate the generator logic here.
    // For now, we assume the API endpoint handles seeding.
    return false; 
};

// --- Exported Functions ---

export const fetchShipments = async (): Promise<Shipment[]> => {
  // Strategy: 1. Try API (Production) -> 2. Try Direct DB (Preview) -> 3. Fallback Empty
  try {
    const data = await handleResponse(await fetch('/api/shipments'));
    return data;
  } catch (apiErr) {
    try {
        const data = await fetchShipmentsDirect();
        return data;
    } catch (dbErr: any) {
        // If table doesn't exist, try to create and seed via API
        if (dbErr.code === '42P01') { // undefined_table
            const pool = new (Pool as any)({ connectionString: NEON_DB_URL });
            await initDB(pool);
            await (pool as any).end();
            await seedDatabase(); // Try seeding via API
            
            // Retry fetch once
            try {
                return await fetchShipmentsDirect();
            } catch (retryErr) {
                return [];
            }
        }
        console.error("DB Fetch Error:", dbErr);
        return [];
    }
  }
};

export const fetchContacts = async (): Promise<ShipperContact[]> => {
  try {
    const data = await handleResponse(await fetch('/api/contacts'));
    return data;
  } catch (apiErr) {
    try {
        const data = await fetchContactsDirect();
        return data;
    } catch (dbErr: any) {
         if (dbErr.code === '42P01') {
            return [];
         }
        console.error("DB Contact Fetch Error:", dbErr);
        return [];
    }
  }
};

export const seedDatabase = async () => {
  try {
    await handleResponse(await fetch('/api/seed'));
    return true;
  } catch (apiErr) {
    console.error("Seeding failed: API unreachable");
    return false;
  }
};
