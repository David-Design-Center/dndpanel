# Shipments Folder Restructure - Google Drive Integration

## 🎯 Overview

The Shipments page has been restructured to behave like **Google Drive**, where each shipment reference creates its own folder, and all documents for that shipment are organized within that folder.

## 📁 New Folder Structure

### Before (Old System)
```
Google Drive/
└── Shipment Documents/
    ├── file1.pdf
    ├── file2.pdf
    ├── file3.pdf
    └── file4.pdf (all files in one flat folder)
```

### After (New System)
```
Google Drive/
└── Shipment Documents/
    ├── EXM-2501215/
    │   ├── bill_of_lading.pdf
    │   ├── packing_list.pdf
    │   └── commercial_invoice.pdf
    ├── EXM-2501216/
    │   ├── customs_document.pdf
    │   └── certificate_of_origin.pdf
    └── EXM-2501217/
        └── shipping_manifest.pdf
```

## 🚀 How It Works

### 1. **User Creates Shipment with Reference**
When you create a new shipment in the UI:
- Assign a **Reference name** (e.g., `EXM-2501215`)
- This reference becomes the folder name in Google Drive
- A subfolder is automatically created under `Shipment Documents/`

### 2. **Upload Documents to Shipment**
When you upload files:
- Click the upload button for a specific shipment
- Files are uploaded to that shipment's folder: `Shipment Documents/EXM-2501215/`
- Multiple files can be uploaded at once
- Each file is stored in the correct folder automatically

### 3. **Browse in Google Drive**
Users can:
- Navigate directly to Google Drive
- Open `Shipment Documents` folder
- See all shipment folders organized by reference
- Download/share files using Google Drive's native features

## 🔧 Technical Implementation

### Code Changes

#### `GoogleDriveService.ts` Updates

**New Methods:**
1. `ensureRootFolder()` - Creates/gets the main "Shipment Documents" folder
2. `ensureShipmentSubfolder(shipmentRef, parentFolderId)` - Creates/gets subfolder for each shipment

**Updated Method:**
- `uploadFile()` now:
  - Fetches the shipment reference from database
  - Creates folder hierarchy: `Shipment Documents/{ref}/`
  - Uploads file to the specific shipment folder

### Database Schema

No database changes needed! Uses existing `documents` table:
```typescript
interface ShipmentDocument {
  id: string;
  shipment_id: number | null;  // Links to shipments table
  file_name: string;
  drive_file_id: string;        // Google Drive file ID
  drive_file_url: string;       // Direct link to file
  file_size: number;
  file_type: string;
  uploaded_by: string;
  uploaded_at: string;
}
```

### Shipments Table Reference

The `shipments` table must have a `ref` field:
```typescript
interface Shipment {
  id: number;
  ref: string;              // Reference name (e.g., "EXM-2501215")
  eta?: string | null;
  etd?: string | null;
  container_n?: string;
}
```

## 📋 User Workflow

### Creating a New Shipment with Documents

1. **Click "Upload" button** on Shipments page
2. **Fill in shipment details:**
   - Reference: `EXM-2501215` (required - becomes folder name)
   - ETA, ETD, Container Number (optional)
3. **Upload documents** (drag & drop or browse)
4. **Submit** - System will:
   - Create shipment record in database
   - Create folder `Shipment Documents/EXM-2501215/` in Google Drive
   - Upload all files to that folder
   - Save metadata to `documents` table

### Uploading to Existing Shipment

1. **Click row** in shipments table to open details modal
2. **Click "Upload Documents"** button
3. **Select files** to upload
4. Files are uploaded to the existing folder for that shipment

### Bulk Upload (Unassigned Documents)

1. **Click "Upload Many"** button
2. **Select multiple files**
3. Files are uploaded to the root `Shipment Documents/` folder
4. You can later assign them to specific shipments

## ✅ Benefits

### For Users
- ✅ **Easy organization** - Find documents by shipment reference
- ✅ **Google Drive native** - Use familiar Google Drive interface
- ✅ **Shareable folders** - Share entire shipment folder with stakeholders
- ✅ **Version control** - Google Drive handles file versioning

### For Developers
- ✅ **Minimal code changes** - ~50 lines of code modified
- ✅ **No database migration** - Uses existing schema
- ✅ **Scalable** - Google Drive handles millions of files
- ✅ **No storage costs** - No Supabase storage limits

### For Business
- ✅ **Professional organization** - Clients see organized folders
- ✅ **Audit trail** - Track who uploaded what and when
- ✅ **Compliance ready** - Easy to export folders for audits
- ✅ **Cost effective** - Uses existing Google Workspace

## 🧪 Testing

### Test Scenarios

1. **Create new shipment with documents**
   - Verify folder is created in Google Drive
   - Verify files are in the correct folder
   - Verify metadata is saved in database

2. **Upload to existing shipment**
   - Verify files go to existing folder
   - Verify no duplicate folders are created

3. **Bulk upload without shipment**
   - Verify files go to root folder
   - Verify they show as "unassigned" in UI

4. **View documents in UI**
   - Verify documents list shows correct files
   - Verify download links work
   - Verify preview modal works

5. **Browse in Google Drive**
   - Open Google Drive manually
   - Navigate to `Shipment Documents/`
   - Verify folder structure matches UI

## 🔐 Security

### Row Level Security (RLS)
The `documents` table has RLS policies ensuring:
- Users can only see documents for shipments they own
- Only authenticated users can upload
- Only document owner or shipment owner can delete

### Google Drive Permissions
- Files are created with user's Google account
- Only users with access to the Drive account can see files
- Folders can be shared using Google Drive's native sharing

## 🆘 Troubleshooting

### Issue: "Shipment not found"
**Solution**: Ensure the shipment exists in database before uploading. The system validates shipment existence before creating folders.

### Issue: "Duplicate folders in Google Drive"
**Solution**: The system checks for existing folders by name. If you see duplicates, manually delete them in Google Drive. The system will use the first one found.

### Issue: "Files not appearing in UI"
**Solution**: 
1. Check browser console for errors
2. Verify `documents` table has correct `shipment_id`
3. Refresh the page to reload data

### Issue: "Can't find folder in Google Drive"
**Solution**: Search for "Shipment Documents" in Google Drive. If it doesn't exist, the system will create it on first upload.

## 🔄 Migration from Old System

If you have existing documents in the old flat structure:

1. **Manual Migration** (Recommended):
   - Open Google Drive
   - Navigate to `Shipment Documents/`
   - Create subfolders for each shipment reference
   - Move files to appropriate subfolders

2. **Database Remains Same**:
   - No need to update `documents` table
   - Drive file IDs remain valid
   - Links continue to work

## 📚 Related Documentation

- `README/GOOGLE_DRIVE_SETUP.md` - Initial Google Drive integration setup
- `README/SHIPMENTS_UPLOAD_FEATURE.md` - Original upload feature implementation
- `src/services/googleDriveService.ts` - Service implementation
- `src/pages/Shipments.tsx` - UI implementation

## 🎉 Summary

This restructure makes the Shipments page behave like Google Drive with:
- **Folder per shipment reference** (e.g., `EXM-2501215`)
- **Automatic folder creation** on first upload
- **Natural organization** that mirrors real-world workflow
- **Simple and straightforward** - minimal code changes

The implementation is complete and ready to use! 🚀
