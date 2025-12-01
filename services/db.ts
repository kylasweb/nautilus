
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

const importShipmentsDirect = async (shipments: Shipment[]) => {
    const pool = new (Pool as any)({ connectionString: NEON_DB_URL });
    try {
        const query = `
            INSERT INTO shipments (
            house_bol_number, shipper_name, consignee_name, consignee_city, 
            consignee_address, notify_party, place_of_receipt, us_arrival_port, 
            arrival_date, teu, nvocc_name, vocc_code, vocc_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (house_bol_number) DO UPDATE SET
                shipper_name = EXCLUDED.shipper_name,
                consignee_name = EXCLUDED.consignee_name,
                consignee_city = EXCLUDED.consignee_city,
                consignee_address = EXCLUDED.consignee_address,
                notify_party = EXCLUDED.notify_party,
                place_of_receipt = EXCLUDED.place_of_receipt,
                us_arrival_port = EXCLUDED.us_arrival_port,
                arrival_date = EXCLUDED.arrival_date,
                teu = EXCLUDED.teu,
                nvocc_name = EXCLUDED.nvocc_name,
                vocc_code = EXCLUDED.vocc_code,
                vocc_name = EXCLUDED.vocc_name
        `;
        
        // Parallel execution for preview speed, or sequential to avoid connection limits
        // Using Promise.all for a chunk might be better but for demo direct loop is robust
        for (const s of shipments) {
             await (pool as any).query(query, [
                s.houseBolNumber, s.shipperName, s.consigneeName, s.consigneeCity,
                s.consigneeAddress, s.notifyParty, s.placeOfReceipt, s.usArrivalPort,
                s.arrivalDate, s.teu, s.nvoccName, s.voccCode, s.voccName
             ]);
        }
        return true;
    } finally {
        await (pool as any).end();
    }
};

const importContactsDirect = async (contacts: ShipperContact[]) => {
    const pool = new (Pool as any)({ connectionString: NEON_DB_URL });
    try {
         const query = `
            INSERT INTO shipper_contacts (
            shipper_name, email, contact_number, address, city, latitude, longitude,
            pan_number, cin_number, customer_type, company_size, contact_person_name, designation, last_updated
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
            ON CONFLICT (shipper_name) DO UPDATE SET
            email = COALESCE(EXCLUDED.email, shipper_contacts.email),
            contact_number = COALESCE(EXCLUDED.contact_number, shipper_contacts.contact_number),
            address = COALESCE(EXCLUDED.address, shipper_contacts.address),
            city = COALESCE(EXCLUDED.city, shipper_contacts.city),
            latitude = COALESCE(EXCLUDED.latitude, shipper_contacts.latitude),
            longitude = COALESCE(EXCLUDED.longitude, shipper_contacts.longitude),
            pan_number = COALESCE(EXCLUDED.pan_number, shipper_contacts.pan_number),
            cin_number = COALESCE(EXCLUDED.cin_number, shipper_contacts.cin_number),
            customer_type = COALESCE(EXCLUDED.customer_type, shipper_contacts.customer_type),
            company_size = COALESCE(EXCLUDED.company_size, shipper_contacts.company_size),
            contact_person_name = COALESCE(EXCLUDED.contact_person_name, shipper_contacts.contact_person_name),
            designation = COALESCE(EXCLUDED.designation, shipper_contacts.designation),
            last_updated = NOW()
        `;
        
        for (const c of contacts) {
             await (pool as any).query(query, [
                c.shipperName, c.email || null, c.contactNumber || null, 
                c.address || null, c.city || null, c.latitude || null, c.longitude || null,
                c.panNumber || null, c.cinNumber || null,
                c.customerType || null, c.companySize || null, c.contactPersonName || null, 
                c.designation || null
             ]);
        }
        return true;
    } finally {
        await (pool as any).end();
    }
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

export const importShipments = async (shipments: Shipment[]) => {
    try {
        await handleResponse(await fetch('/api/shipments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shipments)
        }));
        return true;
    } catch (apiErr) {
        console.warn("API Import failed, falling back to direct DB");
        return await importShipmentsDirect(shipments);
    }
};

export const importContacts = async (contacts: ShipperContact[]) => {
    try {
        await handleResponse(await fetch('/api/contacts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contacts)
        }));
        return true;
    } catch (apiErr) {
        console.warn("API Contact Import failed, falling back to direct DB");
        return await importContactsDirect(contacts);
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
