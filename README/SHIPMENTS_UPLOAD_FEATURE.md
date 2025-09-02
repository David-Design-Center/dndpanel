# Shipments Upload Feature Implementation

## Overview

The shipments panel has been enhanced with document upload functionality using Google Drive API. This allows users to upload, download, and manage documents specific to each container/shipment while preserving the existing data logic and avoiding Supabase storage limits.

## Features Added

### 📁 File Upload System
- **Drag & Drop Interface**: Modern file upload with drag-and-drop support
- **File Validation**: Automatic validation for file types and size limits
- **Multiple File Upload**: Support for uploading multiple documents at once
- **Progress Feedback**: Visual feedback during upload process

### 🚢 Container-Specific Documents
- **Per-Container Storage**: Documents are organized by shipment/container in Google Drive
- **Document Management**: Upload, download, and delete functionality
- **Real-time Updates**: Document list updates immediately after operations
- **File Type Icons**: Visual file type indicators (PDF, DOC, XLS, etc.)

### 🔒 Security & Authentication
- **Google Drive Integration**: Uses user's Google Drive for secure storage
- **User Authentication**: Only authenticated users can upload/manage documents
- **Row-Level Security**: Proper RLS policies for database metadata protection

## Database Schema

### New Tables Created

#### `shipments`
```sql
- id (SERIAL PRIMARY KEY)
- ref (text) - Shipment reference number
- consignee (text) - Recipient company
- shipper (text) - Sender company  
- vessel_carrier (text) - Shipping line
- etd (text) - Estimated Time of Departure
- eta (text) - Estimated Time of Arrival
- container_n (text) - Container number
- description_of_goods (text) - Cargo description
- shipping_status (text) - Current status
- created_at (timestamptz)
- updated_at (timestamptz)
```

#### `shipment_documents`
```sql
- id (uuid PRIMARY KEY)
- shipment_id (integer) - Foreign key to shipments
- file_name (text) - Original filename
- drive_file_id (text) - Google Drive file ID
- drive_file_url (text) - Google Drive viewable URL
- file_size (bigint) - File size in bytes
- file_type (text) - MIME type
- uploaded_by (uuid) - User who uploaded the file
- uploaded_at (timestamptz)
```

### Google Drive Storage
- **Integration**: Direct upload to user's Google Drive
- **Organization**: Files stored in "Shipment Documents" folder
- **Access**: Files accessible through Google Drive URLs

## Implementation Files

### Core Services
- `src/services/googleDriveService.ts` - Main service for Google Drive operations
- `src/services/backendApi.ts` - Updated with shipment document fetching

### UI Components
- `src/components/ui/file-upload.tsx` - Reusable file upload component
- `src/components/ui/upload-documents-modal.tsx` - Modal for document upload
- `src/pages/Shipments.tsx` - Enhanced shipments page with upload functionality

### Database
- `supabase/migrations/20250822120000_create_shipments_and_upload.sql` - Main migration
- `supabase/migrations/20250822120001_add_sample_shipments.sql` - Sample data

## Setup Instructions

### 1. Database Setup
```bash
# Make sure Docker Desktop is running, then:
./setup-shipments.sh
```

### 2. Environment Variables
Ensure your `.env` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Google Drive API Setup
**IMPORTANT**: You need to implement Google Drive authentication first:

1. **Add Google Drive Scope**: Update your Google authentication to include Drive scope
2. **Implement Token Access**: Update `googleDriveService.ts` to get the user's Google access token
3. **Test Access**: Ensure users can authenticate with Google Drive permissions

### 4. Test the Feature
1. Navigate to the Shipments page
2. Expand any shipment container section
3. Click the "Upload" button
4. Select files and upload
5. Verify files appear in the container documents section

## Usage Guide

### For Users

#### Uploading Documents
1. Go to **Shipments** page
2. Expand a shipment container
3. Click **Upload** button in the "Container Documents" section
4. Drag & drop files or click to select
5. Supported formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
6. Maximum file size: 10MB per file
7. Click **Upload** to save

#### Managing Documents
- **Download**: Click the download icon next to any document
- **Delete**: Click the delete icon (only for documents you uploaded)
- **View Details**: See upload date and file size

### For Developers

#### Adding New File Types
Update the `accept` prop in `FileUpload` component:
```typescript
accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
```

#### Customizing Upload Limits
Modify the `maxSize` prop (in MB):
```typescript
<FileUpload maxSize={20} />
```

#### Adding File Processing
Extend `ShipmentDocumentService.uploadDocument()` to add file processing hooks.

## Data Persistence

### Existing Logic Preserved
- All existing shipment data fetching logic remains unchanged
- General documents section continues to work as before
- Cache mechanisms for performance are maintained

### New Data Flow
1. **Upload**: File → Supabase Storage → Database record
2. **Display**: Database query → Add download URLs → UI rendering
3. **Delete**: Remove from storage → Remove database record

## Error Handling

### File Upload Errors
- File size too large
- Unsupported file type
- Network connectivity issues
- Storage quota exceeded

### User Experience
- Clear error messages
- Upload progress indicators
- Graceful fallbacks for failed operations
- Immediate UI updates after successful operations

## Performance Considerations

### Optimizations Implemented
- **Lazy Loading**: Documents loaded per shipment on demand
- **Caching**: Shipment data cached to reduce API calls
- **Batch Operations**: Multiple file uploads handled efficiently
- **Progressive Enhancement**: UI works without JavaScript for basic functionality

### Monitoring
- File upload success/failure rates
- Storage usage tracking
- User activity logs for audit purposes

## Security Features

### Access Control
- Authentication required for all operations
- RLS policies prevent unauthorized access
- File access through signed URLs only

### Data Protection
- Files stored in private bucket
- Secure file deletion (both storage and database)
- User-specific upload tracking

## Future Enhancements

### Planned Features
- [ ] File versioning support
- [ ] Bulk document operations
- [ ] Document categories/tags
- [ ] OCR text extraction for searchability
- [ ] Document preview functionality
- [ ] Email notifications for new uploads

### Integration Opportunities
- [ ] Connect with existing email attachments
- [ ] Link to customer orders and invoices
- [ ] Export document lists to PDF/Excel
- [ ] API webhooks for document events

## Troubleshooting

### Common Issues

**Upload fails silently**
- Check browser console for errors
- Verify Supabase connection
- Confirm storage bucket exists

**Files not appearing**
- Check RLS policies are correct
- Verify user authentication
- Refresh the shipment documents

**Permission denied errors**
- Ensure user is authenticated
- Check storage bucket policies
- Verify file path structure

### Debug Tools
```javascript
// Check user authentication
console.log(supabase.auth.getUser())

// Test storage connection
supabase.storage.from('shipment-documents').list()

// Verify RLS policies
supabase.from('shipment_documents').select('*')
```

## Support

For technical issues or feature requests related to the shipments upload functionality, check:
1. Browser console for error messages
2. Supabase dashboard for storage/database issues  
3. Network tab for failed API requests
