-- Enable real-time updates for lab_work_requests table

-- Set replica identity to FULL to capture complete row data during updates
ALTER TABLE lab_work_requests REPLICA IDENTITY FULL;

-- Add the table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE lab_work_requests;