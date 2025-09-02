# Root SQL Archive

This folder contains SQL scripts that were originally in the repository root.

## Purpose
These files were created as **manual workarounds** when the Supabase CLI couldn't connect properly. They contain SQL commands that were manually copied and pasted into the Supabase SQL Editor.

## Status
- **Archived on:** August 29, 2025
- **Reason:** All functionality has been properly implemented in timestamped migrations
- **Safe to delete:** Yes, these are duplicates of existing migrations

## Files
- `add_contact_id_to_invoices.sql` - Manual script to add contact_id column to invoices
- `add_shipment_documents_table.sql` - Manual script to create shipment_documents table
- `contacts_dump.sql` - Empty dump file
- `enable_dynamic_sql.sql` - Manual script to add dynamic SQL helper functions
- `fix_contacts_rls.sql` - Manual script to fix RLS policies for contacts table
- `fix_shipments_rls.sql` - Manual script to fix RLS policies for shipments table
- `manual_add_documents_column.sql` - Manual script to add documents column to shipments
- `shipments_structure_migration.sql` - Manual script to update shipments table structure
- `shipments_table_update.sql` - Manual script to update shipments table structure
- `update_shipments_structure.sql` - Manual script to update shipments table structure

## Migration Status
All these changes have been properly implemented in the timestamped migration files in the parent `migrations/` directory.
