# Shipments Folder Architecture

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│                     (Shipments.tsx)                          │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ User clicks "Upload"
                          │ for shipment EXM-2501215
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 GoogleDriveService                           │
│              (googleDriveService.ts)                         │
│                                                              │
│  1. uploadFile(file, shipmentId, userId)                    │
│     ├─ Fetch shipment from database                         │
│     │  └─ Get shipment.ref (e.g., "EXM-2501215")           │
│     │                                                        │
│     ├─ ensureRootFolder()                                   │
│     │  └─ Create/Get "Shipment Documents" folder           │
│     │                                                        │
│     ├─ ensureShipmentSubfolder(ref, parentId)              │
│     │  └─ Create/Get "EXM-2501215" subfolder               │
│     │                                                        │
│     └─ Upload file to Google Drive                          │
│        └─ Save metadata to Supabase                         │
└─────────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┴────────────────┐
         ▼                                  ▼
┌──────────────────┐            ┌──────────────────────┐
│  Supabase DB     │            │   Google Drive       │
│                  │            │                      │
│  shipments       │            │  Shipment Documents/ │
│  ├─ id: 1        │            │  ├─ EXM-2501215/    │
│  ├─ ref: "EXM-*" │            │  │  ├─ file1.pdf    │
│  └─ ...          │            │  │  └─ file2.pdf    │
│                  │            │  ├─ EXM-2501216/    │
│  documents       │            │  │  └─ file3.pdf    │
│  ├─ id: uuid     │───links───▶│  └─ EXM-2501217/    │
│  ├─ shipment_id  │            │     └─ file4.pdf    │
│  ├─ file_name    │            │                      │
│  ├─ drive_file_id│◀──refers──┤                      │
│  └─ ...          │            │                      │
└──────────────────┘            └──────────────────────┘
```

## 🔄 Upload Flow Sequence

```
User                 UI              GoogleDriveService    Supabase DB      Google Drive
  │                   │                      │                  │                │
  │ Click Upload      │                      │                  │                │
  ├──────────────────>│                      │                  │                │
  │                   │                      │                  │                │
  │ Select Files      │                      │                  │                │
  ├──────────────────>│                      │                  │                │
  │                   │                      │                  │                │
  │ Submit            │ uploadFile()         │                  │                │
  │                   ├─────────────────────>│                  │                │
  │                   │                      │                  │                │
  │                   │                      │ SELECT * FROM    │                │
  │                   │                      │  shipments       │                │
  │                   │                      │  WHERE id = X    │                │
  │                   │                      ├─────────────────>│                │
  │                   │                      │                  │                │
  │                   │                      │ Returns:         │                │
  │                   │                      │  { ref: "EXM-*" }│                │
  │                   │                      │<─────────────────┤                │
  │                   │                      │                  │                │
  │                   │                      │ ensureRootFolder()                │
  │                   │                      ├──────────────────────────────────>│
  │                   │                      │ Search "Shipment Documents"       │
  │                   │                      │ folder                            │
  │                   │                      │                                   │
  │                   │                      │ Return folder ID                  │
  │                   │                      │<──────────────────────────────────│
  │                   │                      │                  │                │
  │                   │                      │ ensureShipmentSubfolder()         │
  │                   │                      ├──────────────────────────────────>│
  │                   │                      │ Search/Create "EXM-*" subfolder   │
  │                   │                      │                                   │
  │                   │                      │ Return subfolder ID               │
  │                   │                      │<──────────────────────────────────│
  │                   │                      │                  │                │
  │                   │                      │ Upload file                       │
  │                   │                      ├──────────────────────────────────>│
  │                   │                      │ POST /upload/drive/v3/files       │
  │                   │                      │                                   │
  │                   │                      │ Return drive_file_id, URLs        │
  │                   │                      │<──────────────────────────────────│
  │                   │                      │                  │                │
  │                   │                      │ INSERT INTO      │                │
  │                   │                      │  documents       │                │
  │                   │                      ├─────────────────>│                │
  │                   │                      │                  │                │
  │                   │                      │ OK               │                │
  │                   │                      │<─────────────────┤                │
  │                   │                      │                  │                │
  │                   │ Success!             │                  │                │
  │                   │<─────────────────────┤                  │                │
  │                   │                      │                  │                │
  │ Show success msg  │                      │                  │                │
  │<──────────────────┤                      │                  │                │
```

## 📂 Folder Structure Mapping

### Database to Google Drive Mapping

```
Supabase "shipments" table          Google Drive folder structure
────────────────────────            ──────────────────────────────

shipments                           Shipment Documents/
├─ id: 1                           ├─ EXM-2501215/
│  ref: "EXM-2501215"    ────────▶ │  ├─ bill_of_lading.pdf
│  eta: "2025-12-01"               │  ├─ packing_list.pdf
│  container_n: "ABC123"           │  └─ invoice.pdf
│                                  │
├─ id: 2                           ├─ EXM-2501216/
│  ref: "EXM-2501216"    ────────▶ │  └─ customs_doc.pdf
│  eta: "2025-12-05"               │
│                                  │
└─ id: 3                           └─ EXM-2501217/
   ref: "EXM-2501217"    ────────▶    ├─ certificate.pdf
   eta: "2025-12-10"                  └─ manifest.pdf


documents table
├─ id: "uuid-1"
│  shipment_id: 1
│  file_name: "bill_of_lading.pdf"
│  drive_file_id: "gdrive-id-1"    ──refers to──▶  Google Drive file
│  drive_file_url: "https://..."
│
├─ id: "uuid-2"
│  shipment_id: 1
│  file_name: "packing_list.pdf"
│  drive_file_id: "gdrive-id-2"    ──refers to──▶  Google Drive file
│
└─ ...
```

## 🔑 Key Components

### 1. `ensureRootFolder()`
**Purpose**: Create or get the main "Shipment Documents" folder

**Logic**:
```typescript
1. Search Google Drive for folder named "Shipment Documents"
2. If found → Return folder ID
3. If not found → Create folder → Return new folder ID
```

**Result**: Returns Google Drive folder ID for "Shipment Documents"

### 2. `ensureShipmentSubfolder(shipmentRef, parentFolderId)`
**Purpose**: Create or get a shipment-specific subfolder

**Parameters**:
- `shipmentRef`: The reference name (e.g., "EXM-2501215")
- `parentFolderId`: The root "Shipment Documents" folder ID

**Logic**:
```typescript
1. Search Google Drive for folder named "{shipmentRef}"
   - In parent folder {parentFolderId}
   - Not in trash
2. If found → Return folder ID
3. If not found → Create subfolder → Return new folder ID
```

**Result**: Returns Google Drive folder ID for "EXM-2501215"

### 3. `uploadFile(file, shipmentId, userId)`
**Purpose**: Upload a file to the correct shipment folder

**Process**:
```typescript
1. Get shipment from database (fetch shipment.ref)
2. Call ensureRootFolder() → Get root folder ID
3. Call ensureShipmentSubfolder(ref, rootId) → Get shipment folder ID
4. Upload file to Google Drive with parents: [shipmentFolderId]
5. Save metadata to documents table with shipment_id link
```

## 🎯 Design Decisions

### Why Subfolder per Shipment?

**Pros**:
- ✅ Natural organization (mirrors real-world filing)
- ✅ Easy to find documents (search by reference)
- ✅ Shareable (share entire folder with stakeholders)
- ✅ Scalable (Google Drive handles millions of folders)

**Alternatives Considered**:
- ❌ Flat structure → Hard to find documents as system grows
- ❌ Database-only storage → Costs money, less flexible
- ❌ Tags/labels → Google Drive doesn't support well

### Why Keep `documents` Table?

**Reasons**:
1. **Fast queries** - Don't need to call Google Drive API for every list
2. **Metadata** - Store upload info, user who uploaded, timestamps
3. **Relationships** - Link documents to shipments via foreign key
4. **RLS** - Row Level Security for multi-user access control

### Why Not Store Files in Supabase?

**Reasons**:
1. **Storage limits** - Supabase storage has limits, Google Drive doesn't
2. **Costs** - Google Workspace already paid for, Supabase storage costs extra
3. **Familiarity** - Users already know Google Drive
4. **Sharing** - Google Drive native sharing is powerful

## 🔐 Security Model

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│             Supabase Row Level Security (RLS)                │
│  • Check if user owns the shipment                          │
│  • Verify user is authenticated                             │
│  • Enforce access policies                                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ ✅ Authorized
                          ▼
┌─────────────────────────────────────────────────────────────┐
│           Google Drive Service (Backend)                     │
│  • Use user's Google OAuth token                            │
│  • Access only their Drive files                            │
│  • Create folders in their Drive                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Google Drive API                            │
│  • Files created with user's account                        │
│  • Only accessible to that user                             │
│  • Can be shared using Drive's native sharing               │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Performance Considerations

### API Calls per Upload

```
Single file upload:
1. Database query: SELECT shipment
2. Google Drive: Search root folder (cached after first call)
3. Google Drive: Search/Create shipment subfolder
4. Google Drive: Upload file
5. Database query: INSERT document metadata

Total: 2 DB queries + 3 Google API calls
```

### Caching Strategy

- Root folder ID could be cached in memory (future optimization)
- Shipment folder IDs could be cached per session
- Database queries are fast (indexed on shipment_id)

### Scalability

- Google Drive: Handles millions of files/folders
- Supabase: Postgres scales well with proper indexing
- No bottlenecks in current architecture

## 🧪 Testing Checklist

- [ ] Create new shipment → Folder created in Drive
- [ ] Upload file → File appears in correct folder
- [ ] Upload multiple files → All in same folder
- [ ] Upload to existing shipment → Uses existing folder
- [ ] Bulk upload → Files go to root folder
- [ ] Delete file → Removed from Drive and DB
- [ ] View in Drive → Folder structure matches UI
- [ ] Share folder → Other users can access
- [ ] RLS → Users only see their shipments
- [ ] Error handling → Graceful failures

## 📚 Related Files

```
src/
├── services/
│   └── googleDriveService.ts      ← Core implementation
├── pages/
│   └── Shipments.tsx              ← UI
└── types/
    └── index.ts                   ← Type definitions (Shipment, ShipmentDocument)

supabase/
└── migrations/
    └── (existing migrations)       ← No new migrations needed

README/
├── SHIPMENTS_FOLDER_RESTRUCTURE.md    ← User guide (this file)
└── SHIPMENTS_FOLDER_ARCHITECTURE.md   ← Architecture (technical)
```

## 🎉 Summary

This architecture provides:
- **Clean separation** between database metadata and file storage
- **Natural organization** that users understand intuitively
- **Scalable** design that grows with the business
- **Cost-effective** solution using existing Google Workspace
- **Simple implementation** with minimal code changes

The folder-per-shipment approach makes it easy to find, share, and manage documents while leveraging Google Drive's powerful features. 🚀
