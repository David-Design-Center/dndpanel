-- Manual: enable dynamic SQL helper functions
-- Moved from repository root to supabase/migrations for organization
-- Created: 2025-08-29

-- SQL script to enable dynamic SQL execution for column management
-- Run this in Supabase SQL Editor if needed

-- Create function to execute dynamic SQL (needed for column management)
CREATE OR REPLACE FUNCTION execute_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Create function to get table columns information
CREATE OR REPLACE FUNCTION get_table_columns(table_name_param text)
RETURNS TABLE(
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.columns c
  WHERE c.table_name = table_name_param 
    AND c.table_schema = 'public'
  ORDER BY c.ordinal_position;
END;
$$;

-- Grant necessary permissions (adjust as required for your security model)
GRANT EXECUTE ON FUNCTION execute_sql(text) TO authenticated;
GRANT EXECUTE ON FUNCTION execute_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION get_table_columns(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_columns(text) TO anon;
