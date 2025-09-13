# Shipments Page Update

## Overview
Updated the shipments page from a collapsible card layout to a modern table format matching the provided design image. Added CSV import functionality for bulk data management.

## Key Changes

### New Column Structure
- **Ref**: Reference/ritiro_id (same as before)

### New Features
1. **Table Layout**: Clean, sortable table matching the design image
2. **CSV Import**: Bulk import functionality with Italian column names
3. **Bulk Selection**: Checkbox selection for multiple shipments
4. **Enhanced Add Modal**: Updated form with all new fields
5. **Document Management**: Upload/view documents per shipment

### CSV Import Format
The CSV import expects these columns in Italian:
```
ritiro_id,giacenza,pod,vendor,po,PKG,KG,VOL,data_ritiro,note
```

Example CSV row:
```
TEST001,SHIPPED,NEW YORK,Vendor Example,PO12345,57,1091.70,4.000,April-16-2025,Note example
```

### Database Migration
Run the following SQL in Supabase to update the database structure:

```sql
-- File: shipments_structure_migration.sql
```

### Backward Compatibility
The system maintains backward compatibility by:
- Keeping old column names in the Shipment type interface
- Mapping old fields to new fields in the conversion functions
- Supporting both old and new field names in data processing

### Files Changed
- `src/types/index.ts` - Updated Shipment interface
- `src/pages/Shipments.tsx` - Complete rewrite with table layout
- `src/components/ui/add-shipment-modal-new.tsx` - Updated for new fields
- `src/components/ui/csv-import-modal.tsx` - New CSV import component
- `src/services/backendApi.ts` - Updated API functions
- `shipments_structure_migration.sql` - Database migration script

## Usage

### Adding Individual Shipments
1. Click "Add Shipment" button
2. Fill out the comprehensive form
3. Submit to create new shipment

### Importing from CSV
1. Click "Import CSV" button
2. Download the template to see the correct format
3. Upload your CSV file with Italian column names
4. Preview the data and confirm import

### Document Management
1. Click the upload icon in the Actions column
2. Upload documents to Google Drive
3. View/download documents using the file icon

## Next Steps
1. Execute the database migration SQL
2. Test the new functionality
3. Update existing data if needed
4. Train users on the new interface
