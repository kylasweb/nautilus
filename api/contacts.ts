
import { Pool } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return res.status(500).json({ error: 'Database connection string not configured' });
  }

  const pool = new (Pool as any)({ connectionString });

  try {
    if (req.method === 'GET') {
      const result = await (pool as any).query('SELECT * FROM shipper_contacts');
      const rows = (result as any).rows;
      
      const contacts = rows.map((row: any) => ({
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
      }));

      return res.status(200).json(contacts);
    } 
    
    else if (req.method === 'POST') {
      const data = req.body;
      const contacts = Array.isArray(data) ? data : [data];
      
      const client = await (pool as any).connect();
      try {
        await (client as any).query('BEGIN');
        
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

        for (const contact of contacts) {
            await (client as any).query(query, [
                contact.shipperName, contact.email || null, contact.contactNumber || null, 
                contact.address || null, contact.city || null, contact.latitude || null, contact.longitude || null,
                contact.panNumber || null, contact.cinNumber || null,
                contact.customerType || null, contact.companySize || null, contact.contactPersonName || null, 
                contact.designation || null
            ]);
        }

        await (client as any).query('COMMIT');
        return res.status(200).json({ message: 'Contacts updated successfully', count: contacts.length });

      } catch (e) {
          await (client as any).query('ROLLBACK');
          console.error("Batch contact update failed", e);
          return res.status(500).json({ error: "Batch update failed" });
      } finally {
          (client as any).release();
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to process contact request' });
  }
}
