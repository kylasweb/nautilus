import { Pool } from '@neondatabase/serverless';

export default async function handler(req: any, res: any) {
  // Use environment variable for security in production
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return res.status(500).json({ error: 'Database connection string not configured' });
  }

  const pool = new (Pool as any)({ connectionString });

  try {
    if (req.method === 'GET') {
      const result = await (pool as any).query('SELECT * FROM shipments ORDER BY arrival_date DESC LIMIT 1000');
      const rows = (result as any).rows;
      
      // Map to camelCase for frontend
      const shipments = rows.map((row: any) => ({
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

      return res.status(200).json(shipments);
    } 
    
    // Handle POST for data import if needed later
    else if (req.method === 'POST') {
       // Logic for batch insert could go here
       return res.status(501).json({ message: 'Not implemented yet' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to fetch shipments' });
  }
}