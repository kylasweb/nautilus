
import { Pool } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return res.status(500).json({ error: 'Database connection string not configured' });
  }

  const pool = new Pool({ connectionString });

  try {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM shipper_contacts');
      
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
      const contact = req.body;
      
      const query = `
        INSERT INTO shipper_contacts (
          shipper_name, email, contact_number, address, city, latitude, longitude,
          pan_number, cin_number, customer_type, company_size, contact_person_name, designation, last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (shipper_name) DO UPDATE SET
          email = EXCLUDED.email,
          contact_number = EXCLUDED.contact_number,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          pan_number = EXCLUDED.pan_number,
          cin_number = EXCLUDED.cin_number,
          customer_type = EXCLUDED.customer_type,
          company_size = EXCLUDED.company_size,
          contact_person_name = EXCLUDED.contact_person_name,
          designation = EXCLUDED.designation,
          last_updated = NOW()
      `;

      await pool.query(query, [
        contact.shipperName, contact.email, contact.contactNumber, 
        contact.address, contact.city, contact.latitude || null, contact.longitude || null,
        contact.panNumber, contact.cinNumber,
        contact.customerType, contact.companySize, contact.contactPersonName, 
        contact.designation
      ]);

      return res.status(200).json({ message: 'Contact updated successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to process contact request' });
  }
}
