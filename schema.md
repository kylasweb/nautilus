
# Database Schema

Run the following SQL commands in your NeonDB SQL Editor to set up the database tables and Row Level Security (RLS).

```sql
-- Enable UUID extension if needed (optional)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Shipments Table
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

-- 2. Create Shipper Contacts Table
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

-- 3. Enable Row Level Security (RLS)
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipper_contacts ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- For this demo application, we allow public read/write access.
-- In a production environment, you would restrict this to authenticated users.

-- Policy for Shipments
CREATE POLICY "Public Access Shipments" 
ON shipments 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Policy for Shipper Contacts
CREATE POLICY "Public Access Contacts" 
ON shipper_contacts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_shipments_shipper_name ON shipments(shipper_name);
CREATE INDEX IF NOT EXISTS idx_shipments_arrival_date ON shipments(arrival_date);
CREATE INDEX IF NOT EXISTS idx_shipments_us_port ON shipments(us_arrival_port);
CREATE INDEX IF NOT EXISTS idx_shipments_receipt ON shipments(place_of_receipt);
```
