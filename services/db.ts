
import { Pool } from '@neondatabase/serverless';
import { Shipment, ShipperContact } from '../types';
import { INITIAL_SHIPMENTS, INITIAL_CONTACTS } from './data';

// Connection string for direct browser access (Preview Mode)
// In production (Vercel), the API endpoints should use the env var DATABASE_URL
const NEON_DB_URL = 'postgresql://neondb_owner:npg_wa2HK5vrNZOB@ep-wild-unit-a1slxcza-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Helper to handle API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status} ${text}`);
  }
  return response.json();
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

// --- Direct DB Fallback Functions ---

const fetchShipmentsDirect = async (): Promise<Shipment[]> => {
  const pool = new Pool({ connectionString: NEON_DB_URL });
  try {
    const { rows } = await pool.query('SELECT * FROM shipments ORDER BY arrival_date DESC LIMIT 1000');
    return rows.map(mapShipmentFromDb);
  } finally {
    await pool.end();
  }
};

const fetchContactsDirect = async (): Promise<ShipperContact[]> => {
  const pool = new Pool({ connectionString: NEON_DB_URL });
  try {
    const { rows } = await pool.query('SELECT * FROM shipper_contacts');
    return rows.map(mapContactFromDb);
  } finally {
    await pool.end();
  }
};

const seedDatabaseDirect = async () => {
  const pool = new Pool({ connectionString: NEON_DB_URL });
  try {
     // Reuse logic similar to api/seed.ts but client-side
     // Ideally we just call the API, but if API fails, we assume we might need to seed via direct connection?
     // For safety in preview, we'll implement a simple check-and-seed here.
     const client = await pool.connect();
     try {
        await client.query('BEGIN');
        
        // 1. Check if tables exist (Basic sanity check)
        await client.query(`
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
            )
        `);
        
        await client.query(`
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
            )
        `);

        // 2. Insert Data
        const shipmentQuery = `
            INSERT INTO shipments (
            house_bol_number, shipper_name, consignee_name, consignee_city, 
            consignee_address, notify_party, place_of_receipt, us_arrival_port, 
            arrival_date, teu, nvocc_name, vocc_code, vocc_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (house_bol_number) DO NOTHING
        `;

        for (const s of INITIAL_SHIPMENTS) {
            await client.query(shipmentQuery, [
            s.houseBolNumber, s.shipperName, s.consigneeName, s.consigneeCity,
            s.consigneeAddress, s.notifyParty, s.placeOfReceipt, s.usArrivalPort,
            s.arrivalDate, s.teu, s.nvoccName, s.voccCode, s.voccName
            ]);
        }

        const contactQuery = `
            INSERT INTO shipper_contacts (
            shipper_name, email, contact_number, address, city, pan_number, 
            cin_number, customer_type, company_size, contact_person_name, designation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (shipper_name) DO NOTHING
        `;

        for (const c of INITIAL_CONTACTS) {
            await client.query(contactQuery, [
            c.shipperName, c.email, c.contactNumber, c.address, c.city,
            c.panNumber, c.cinNumber, c.customerType, c.companySize,
            c.contactPersonName, c.designation
            ]);
        }

        await client.query('COMMIT');
        return true;
     } catch (e) {
        await client.query('ROLLBACK');
        throw e;
     } finally {
        client.release();
     }
  } finally {
    await pool.end();
  }
};


// --- Exported Functions (Hybrid Strategy) ---

export const fetchShipments = async (): Promise<Shipment[]> => {
  try {
    // 1. Try API (Vercel Prod)
    const data = await handleResponse(await fetch('/api/shipments'));
    return data;
  } catch (err) {
    console.warn('API fetch failed, attempting direct DB connection...', err);
    try {
        // 2. Try Direct DB (Preview/Dev)
        const data = await fetchShipmentsDirect();
        return data;
    } catch (dbErr) {
        console.error('Direct DB fetch failed, using mock data:', dbErr);
        // 3. Fallback to Mock Data
        return INITIAL_SHIPMENTS;
    }
  }
};

export const fetchContacts = async (): Promise<ShipperContact[]> => {
  try {
    const data = await handleResponse(await fetch('/api/contacts'));
    return data;
  } catch (err) {
    console.warn('API fetch failed, attempting direct DB connection...', err);
    try {
        const data = await fetchContactsDirect();
        return data;
    } catch (dbErr) {
        console.error('Direct DB fetch failed, using mock data:', dbErr);
        return INITIAL_CONTACTS;
    }
  }
};

export const seedDatabase = async () => {
  try {
    const data = await handleResponse(await fetch('/api/seed'));
    console.log('Seeding result:', data);
    return true;
  } catch (err) {
    console.warn('API seed failed, attempting direct DB seed...', err);
    try {
        await seedDatabaseDirect();
        return true;
    } catch (dbErr) {
        console.error('Direct DB seed failed:', dbErr);
        return false;
    }
  }
};
