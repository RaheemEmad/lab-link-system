-- Add payment tracking columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' 
  CHECK (payment_status IN ('pending', 'partial', 'paid', 'overdue'));

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_received_at TIMESTAMPTZ;