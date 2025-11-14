# 🚀 Quick Start: New Shipments Folder System

## What Changed?

Your Shipments page now organizes files **like Google Drive**! 

Each shipment reference (e.g., `EXM-2501215`) automatically becomes a folder in Google Drive. 📁

## 🎯 Quick Example

### Old Way (Before)
```
All files in one messy folder:
📁 Shipment Documents
   📄 invoice1.pdf
   📄 invoice2.pdf
   📄 packing_list.pdf
   📄 bill_of_lading.pdf
   
Which file belongs to which shipment? 🤔
```

### New Way (Now)
```
Organized by shipment reference:
📁 Shipment Documents
   📁 EXM-2501215
      📄 invoice.pdf
      📄 packing_list.pdf
   📁 EXM-2501216
      📄 bill_of_lading.pdf
   📁 EXM-2501217
      📄 customs_doc.pdf
      
Super easy to find! ✨
```

## ⚡ How to Use

### 1️⃣ Create New Shipment with Files

**Steps:**
1. Click **"Upload"** button on Shipments page
2. Fill in the form:
   - **Reference**: `EXM-2501215` ← This becomes the folder name!
   - **ETA**: (optional)
   - **ETD**: (optional)
   - **Container #**: (optional)
3. Drag & drop files or click "Browse"
4. Click **"Submit"**

**What happens:**
- ✅ System creates folder: `Shipment Documents/EXM-2501215/`
- ✅ Uploads your files to that folder
- ✅ Shows files in the UI

### 2️⃣ Add More Files to Existing Shipment

**Steps:**
1. Click on a shipment row in the table
2. Details modal opens
3. Click **"Upload Documents"** button
4. Select files
5. Click **"Upload"**

**What happens:**
- ✅ Files uploaded to existing `EXM-2501215/` folder
- ✅ No duplicate folders created
- ✅ All files organized together

### 3️⃣ Upload Without Assigning Shipment

**Steps:**
1. Click **"Upload Many"** button
2. Select multiple files
3. Click **"Upload"**

**What happens:**
- ✅ Files go to root `Shipment Documents/` folder
- ✅ Shows as "unassigned" in UI
- ✅ Can assign to shipments later

## 🔍 Finding Your Files

### In the App
- View files in shipments table
- Click row to see all documents
- Preview, download, or delete files

### In Google Drive
1. Open Google Drive
2. Search for **"Shipment Documents"**
3. Browse folders by shipment reference
4. All your files are there! 🎉

**Bonus**: You can share folders directly from Google Drive!

## 📋 Real-World Example

Let's say you're tracking shipment **EXM-2501215**:

```
Day 1: Create Shipment
───────────────────────
You: Create shipment EXM-2501215
     Upload: invoice.pdf
System: Creates folder "Shipment Documents/EXM-2501215/"
        Uploads invoice.pdf there

Day 3: Add Packing List
───────────────────────
You: Click EXM-2501215 row
     Upload: packing_list.pdf
System: Uploads to same EXM-2501215 folder
        No new folder created!

Day 5: Add Bill of Lading
──────────────────────────
You: Upload: bill_of_lading.pdf
System: Goes to same folder
        All files organized together

Result:
───────
📁 Shipment Documents/EXM-2501215/
   📄 invoice.pdf
   📄 packing_list.pdf
   📄 bill_of_lading.pdf
```

## ✅ Benefits for You

### Easy Organization
- Find documents by shipment reference instantly
- No more searching through flat file lists
- Clear hierarchy matches your workflow

### Google Drive Integration
- Browse files in Google Drive app
- Use Drive's search, filters, and sorting
- Access from mobile, tablet, or desktop

### Collaboration
- Share entire shipment folder with colleagues
- Use Drive's native sharing permissions
- Track who viewed/edited files

### Professional
- Clients see organized folders
- Easy to export for audits
- Looks professional and clean

## ⚠️ Important Notes

### Reference Field is Required
The **Reference** field is what creates the folder name. Make sure to:
- Use unique references (e.g., `EXM-2501215`)
- Use valid folder name characters (no `/`, `\`, `*`, etc.)
- Be consistent with naming (helps with sorting)

### Files Stay in Drive
- Files are stored in **Google Drive**, not our database
- Database only stores file metadata (name, size, link)
- No storage limits (uses your Google Drive space)

### Folder Names Match References
- If reference is `EXM-2501215`, folder is `EXM-2501215`
- Changing reference doesn't rename folder (yet)
- Best practice: Don't change references after creating

## 🆘 Troubleshooting

### "I can't find my files!"
- Check the **Reference name** you used
- Look in Google Drive: `Shipment Documents/{Reference}/`
- Try searching in Drive for the file name

### "Files uploaded to wrong folder"
- Check which shipment you selected
- Verify the reference name
- Files follow the shipment reference automatically

### "Can I move files between shipments?"
- Yes! In Google Drive, just drag & drop
- Or re-assign in the app (coming soon)
- Database will sync on next refresh

### "I see duplicate folders"
- Manually delete duplicates in Google Drive
- System uses the first folder it finds
- Keep only one folder per reference

## 🎓 Tips & Tricks

### Naming Convention
Use consistent reference formats:
```
✅ Good:
   EXM-2501215
   EXM-2501216
   EXM-2501217

❌ Confusing:
   shipment1
   Container ABC
   REF-123
```

### Bulk Operations
- Upload all files for a shipment at once
- Use "Upload Many" for files you'll assign later
- Delete files from details modal

### Sharing with Team
1. Open Google Drive
2. Navigate to `Shipment Documents/EXM-2501215/`
3. Right-click folder → Share
4. Add team members
5. They can view/edit based on permissions

## 🎉 Summary

**What you need to know:**
1. Each shipment reference = 1 folder in Google Drive
2. All files for that shipment go in that folder
3. Browse in app OR Google Drive
4. Simple, organized, professional! 

**That's it!** Start uploading and enjoy the organized bliss! 📦✨

---

**Need help?** 
- Check `README/SHIPMENTS_FOLDER_RESTRUCTURE.md` for detailed guide
- Check `README/SHIPMENTS_FOLDER_ARCHITECTURE.md` for technical details
- Ask your team or check the app documentation
