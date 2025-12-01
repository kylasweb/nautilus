
import { Pool } from '@neondatabase/serverless';
import { Shipment, ShipperContact } from '../types';
import { INITIAL_SHIPMENTS, INITIAL_CONTACTS } from './data';

// Connection string provided by user
const CONNECTION_STRING = 'postgresql://neondb_owner:npg_wa2HK5vrNZOB@ep-wild-unit-a1slxcza-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// Initialize Pool (Lazy initialization happens on first query)
const pool = new Pool({ connectionString: CONNECTION_STRING });

// SQL to Create Schema if it doesn't exist
const CREATE_TABLES_SQL = `
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
      pan_number TEXT,
      cin_number TEXT,
      customer_type TEXT,
      company_size TEXT,
      contact_person_name TEXT,
      designation TEXT,
      last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  
  ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
  ALTER TABLE shipper_contacts ENABLE ROW LEVEL SECURITY;
  
  -- Re-create policies to ensure they exist
  DROP POLICY IF EXISTS "Public Access Shipments" ON shipments;
  CREATE POLICY "Public Access Shipments" ON shipments FOR ALL USING (true) WITH CHECK (true);
  
  DROP POLICY IF EXISTS "Public Access Contacts" ON shipper_contacts;
  CREATE POLICY "Public Access Contacts" ON shipper_contacts FOR ALL USING (true) WITH CHECK (true);
`;

const initDB = async () => {
    console.log("Initializing Database Schema...");
    const client = await pool.connect();
    try {
        await client.query(CREATE_TABLES_SQL);
        console.log("Schema Initialized.");
        return true;
    } catch(e) {
        console.error("Failed to initialize schema:", e);
        throw e;
    } finally {
        client.release();
    }
};

export const fetchShipments = async (): Promise<Shipment[]> => {
  try {
    const { rows } = await pool.query('SELECT * FROM shipments ORDER BY arrival_date DESC LIMIT 1000');
    
    // Map Snake_Case DB columns to CamelCase Frontend types
    return rows.map((row: any) => ({
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
    }));
  } catch (err: any) {
    // Check for "relation does not exist" error (Postgres Code 42P01)
    if (err.code === '42P01') {
        console.warn("Tables not found. Attempting to initialize DB...");
        await initDB();
        await seedDatabase();
        return fetchShipments(); // Retry fetch after init
    }

    console.error('DB Error fetching shipments:', err);
    console.warn('Falling back to local mock data');
    return INITIAL_SHIPMENTS;
  }
};

export const fetchContacts = async (): Promise<ShipperContact[]> => {
  try {
    const { rows } = await pool.query('SELECT * FROM shipper_contacts');
    
    return rows.map((row: any) => ({
      shipperName: row.shipper_name,
      email: row.email || '',
      contactNumber: row.contact_number || '',
      address: row.address || '',
      city: row.city || '',
      panNumber: row.pan_number || '',
      cinNumber: row.cin_number || '',
      customerType: row.customer_type || '',
      companySize: row.company_size || '',
      contactPersonName: row.contact_person_name || '',
      designation: row.designation || '',
      lastUpdated: row.last_updated
    }));
  } catch (err: any) {
    if (err.code === '42P01') {
        // If fetchShipments didn't catch it first (unlikely but possible due to async), handle it here
        await initDB();
        await seedDatabase();
        return fetchContacts();
    }

    console.error('DB Error fetching contacts:', err);
    console.warn('Falling back to local mock data');
    return INITIAL_CONTACTS;
  }
};

export const seedDatabase = async () => {
  try {
      console.log('Starting DB Seeding...');
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');

        // 1. Seed Shipments
        const shipmentQuery = `
            INSERT INTO shipments (
            house_bol_number, shipper_name, consignee_name, consignee_city, 
            consignee_address, notify_party, place_of_receipt, us_arrival_port, 
            arrival_date, teu, nvocc_name, vocc_code, vocc_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (house_bol_number) DO NOTHING
        `;

        // Batch insert could be optimized, but loop is fine for seed data size
        let sCount = 0;
        for (const s of INITIAL_SHIPMENTS) {
            await client.query(shipmentQuery, [
            s.houseBolNumber, s.shipperName, s.consigneeName, s.consigneeCity,
            s.consigneeAddress, s.notifyParty, s.placeOfReceipt, s.usArrivalPort,
            s.arrivalDate, s.teu, s.nvoccName, s.voccCode, s.voccName
            ]);
            sCount++;
        }

        // 2. Seed Contacts
        const contactQuery = `
            INSERT INTO shipper_contacts (
            shipper_name, email, contact_number, address, city, pan_number, 
            cin_number, customer_type, company_size, contact_person_name, designation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (shipper_name) DO NOTHING
        `;

        let cCount = 0;
        for (const c of INITIAL_CONTACTS) {
            await client.query(contactQuery, [
            c.shipperName, c.email, c.contactNumber, c.address, c.city,
            c.panNumber, c.cinNumber, c.customerType, c.companySize,
            c.contactPersonName, c.designation
            ]);
            cCount++;
        }

        await client.query('COMMIT');
        console.log(`Seeding Complete. Shipments: ${sCount}, Contacts: ${cCount}`);
        return true;
      } catch (e) {
          await client.query('ROLLBACK');
          throw e;
      } finally {
          client.release();
      }
  } catch (error) {
    console.error('Seeding error:', error);
    // Do not throw, just log. App will continue with what it has.
  }
};
