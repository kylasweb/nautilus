
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
    
    else if (req.method === 'POST') {
       const shipments = req.body;
       if (!Array.isArray(shipments)) {
           return res.status(400).json({ error: 'Expected an array of shipments' });
       }

       const client = await (pool as any).connect();
       try {
           await (client as any).query('BEGIN');
           
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

           for (const s of shipments) {
               await (client as any).query(query, [
                s.houseBolNumber, s.shipperName, s.consigneeName, s.consigneeCity,
                s.consigneeAddress, s.notifyParty, s.placeOfReceipt, s.usArrivalPort,
                s.arrivalDate, s.teu, s.nvoccName, s.voccCode, s.voccName
               ]);
           }

           await (client as any).query('COMMIT');
           return res.status(200).json({ message: 'Import successful', count: shipments.length });
       } catch (e) {
           await (client as any).query('ROLLBACK');
           console.error('Batch import failed', e);
           return res.status(500).json({ error: 'Batch import failed' });
       } finally {
           (client as any).release();
       }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ error: 'Failed to fetch shipments' });
  }
}
