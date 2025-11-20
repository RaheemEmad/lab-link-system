-- First, rename the crown_type enum to restoration_type and update values
ALTER TYPE crown_type RENAME TO restoration_type;

-- Drop the old constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_crown_type_check;

-- Update the enum values (need to drop and recreate)
-- First add new values
ALTER TYPE restoration_type ADD VALUE IF NOT EXISTS 'Crown';
ALTER TYPE restoration_type ADD VALUE IF NOT EXISTS 'Bridge';
ALTER TYPE restoration_type ADD VALUE IF NOT EXISTS 'Zirconia Layer';
ALTER TYPE restoration_type ADD VALUE IF NOT EXISTS 'Zirco-Max';

-- Rename the column in orders table
ALTER TABLE orders RENAME COLUMN crown_type TO restoration_type;

-- Add new column for HTML export
ALTER TABLE orders ADD COLUMN IF NOT EXISTS html_export TEXT;

-- Add shade system column to track which system was used
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shade_system TEXT CHECK (shade_system IN ('VITA Classical', 'VITA 3D-Master'));