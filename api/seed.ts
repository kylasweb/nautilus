import { Pool } from '@neondatabase/serverless';

// --- Mock Data Generators (Duplicated from frontend logic for server-side independence) ---
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
const CUST_TYPES = ['Pvt Ltd', 'Partnership', 'Limited', 'LLP'];
const SIZES = ['SME', 'Large', 'Ultra Large'];
const SHIPPER_CITIES = ['Shanghai', 'Singapore', 'Mumbai', 'Rotterdam', 'Hamburg'];

const generateMockShipments = (count: number) => {
  const shipments = [];
  const start = new Date('2023-01-01').getTime();
  const end = new Date('2024-05-30').getTime();

  for (let i = 0; i < count; i++) {
    const randomDate = new Date(start + Math.random() * (end - start));
    const shipper = SHIPPERS[Math.floor(Math.random() * SHIPPERS.length)];
    const consignee = CONSIGNEES[Math.floor(Math.random() * CONSIGNEES.length)];
    const vocc = VOCCS[Math.floor(Math.random() * VOCCS.length)];
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

const generateMockContacts = () => {
    return SHIPPERS.map((name, idx) => ({
        shipperName: name,
        email: `info@${name.toLowerCase().replace(/\s/g, '')}.com`,
        contactNumber: `+1-555-${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
        address: `${Math.floor(Math.random() * 100)} Trade Zone`,
        city: SHIPPER_CITIES[idx % SHIPPER_CITIES.length],
        panNumber: `ABCDE${Math.floor(1000 + Math.random() * 8999)}F`,
        cinNumber: `L${Math.floor(10000 + Math.random() * 90000)}MH2000PLC${Math.floor(100000 + Math.random() * 900000)}`,
        customerType: CUST_TYPES[Math.floor(Math.random() * CUST_TYPES.length)],
        companySize: SIZES[Math.floor(Math.random() * SIZES.length)],
        contactPersonName: ['John Smith', 'Sarah Chen', 'Mike Ross', 'Jessica Pearson'][Math.floor(Math.random() * 4)],
        designation: ['Logistics Manager', 'Director', 'Supply Chain Head', 'Operations Lead'][Math.floor(Math.random() * 4)]
    }));
};

export default async function handler(req: any, res: any) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return res.status(500).json({ error: 'Database connection string not configured' });
  }

  const pool = new (Pool as any)({ connectionString });

  try {
      const shipments = generateMockShipments(450);
      const contacts = generateMockContacts();

      const client = await (pool as any).connect();
      try {
        await (client as any).query('BEGIN');

        // Seed Shipments
        const shipmentQuery = `
            INSERT INTO shipments (
            house_bol_number, shipper_name, consignee_name, consignee_city, 
            consignee_address, notify_party, place_of_receipt, us_arrival_port, 
            arrival_date, teu, nvocc_name, vocc_code, vocc_name
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            ON CONFLICT (house_bol_number) DO NOTHING
        `;

        for (const s of shipments) {
            await (client as any).query(shipmentQuery, [
            s.houseBolNumber, s.shipperName, s.consigneeName, s.consigneeCity,
            s.consigneeAddress, s.notifyParty, s.placeOfReceipt, s.usArrivalPort,
            s.arrivalDate, s.teu, s.nvoccName, s.voccCode, s.voccName
            ]);
        }

        // Seed Contacts
        const contactQuery = `
            INSERT INTO shipper_contacts (
            shipper_name, email, contact_number, address, city, pan_number, 
            cin_number, customer_type, company_size, contact_person_name, designation
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (shipper_name) DO NOTHING
        `;

        for (const c of contacts) {
            await (client as any).query(contactQuery, [
            c.shipperName, c.email, c.contactNumber, c.address, c.city,
            c.panNumber, c.cinNumber, c.customerType, c.companySize,
            c.contactPersonName, c.designation
            ]);
        }

        await (client as any).query('COMMIT');
        return res.status(200).json({ message: 'Database seeded successfully', count: shipments.length });
      } catch (e) {
          await (client as any).query('ROLLBACK');
          throw e;
      } finally {
          (client as any).release();
      }
  } catch (error) {
    console.error('Seeding error:', error);
    return res.status(500).json({ error: 'Failed to seed database' });
  }
}