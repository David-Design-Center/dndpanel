# Google Drive Integration Setup Guide

## 🎯 **Overview**
This guide helps you complete the Google Drive integration for the shipments upload feature. The client-side implementation is ready and will use your existing `refresh-gmail-token` Supabase Edge Function.

## ✅ **What's Already Done**

The client-side code is **completely implemented** and ready to work with your existing token infrastructure. It will:

1. **Call your existing Edge Function**: Uses `refresh-gmail-token` with `scope: 'drive'`
2. **Handle authentication**: Passes user ID and session token
3. **Manage uploads**: Uploads files directly to Google Drive
4. **Update database**: Stores Drive file metadata directly in `shipments.documents` JSONB column (no separate table needed!)

## 🛠️ **What You Need to Do**

### **Step 1: Update Your Edge Function** ⚡
Extend your existing `refresh-gmail-token` function to handle Drive tokens.

**📖 Complete guide**: See `README/SERVER_SIDE_DRIVE_SETUP.md`

**Quick implementation**:
```typescript
// In your refresh-gmail-token function, add:
const { user_id, scope = 'gmail' } = await req.json();

if (scope === 'drive') {
  const driveToken = await getGoogleDriveToken(user_id);
  return new Response(JSON.stringify({ access_token: driveToken }));
}
// Your existing Gmail logic continues...
```

### **Step 2: Enable Google Drive API** 🔧
1. Go to **Google Cloud Console**
2. Navigate to **APIs & Services > Enabled APIs**
3. Click **"+ ENABLE APIS AND SERVICES"**
4. Search for **"Google Drive API"**
5. Click **"ENABLE"**

### **Step 3: Update Service Account Scopes** 🔑
Add Drive scope to your domain-wide delegation:
```
https://www.googleapis.com/auth/drive.file
```

### **Step 4: Test the Integration** 🧪
1. Try uploading a document in the shipments page
2. Check browser console for logs
3. Verify file appears in Google Drive under "Shipment Documents"

## 🔍 **Current Implementation Status**

### ✅ **Ready (Client-Side)**
- File upload UI with drag & drop
- Google Drive service integration
- Error handling and user feedback
- Database integration for metadata
- Document management (view, delete)

### 🔄 **Needs Update (Server-Side)**
- Edge function scope handling
- Google Drive API enablement
- Service account permissions

## 🚀 **Expected Behavior After Setup**

1. **User uploads file** → UI shows upload progress
2. **Client calls your Edge Function** → `scope: 'drive'` parameter
3. **Server returns Drive token** → Function generates appropriate token
4. **File uploads to Google Drive** → Stored in "Shipment Documents" folder
5. **Metadata saved to database** → Drive file metadata stored in `shipments.documents` JSONB column
6. **UI updates immediately** → Document appears in shipment container

## � **Testing Checklist**

- [ ] Edge function handles `scope: 'drive'` parameter
- [ ] Google Drive API is enabled in Cloud Console
- [ ] Service account has Drive scope permissions
- [ ] File upload works from shipments page
- [ ] Files appear in Google Drive
- [ ] Documents can be viewed/downloaded
- [ ] Documents can be deleted
- [ ] Error handling works properly

## 🆘 **Troubleshooting**

### **"Token refresh failed"**
- Check Edge function logs
- Verify service account credentials
- Ensure Drive API is enabled

### **"Failed to upload file to Google Drive"**
- Check browser network tab
- Verify token has Drive scope
- Check Google Cloud Console quotas

### **Files upload but don't appear in UI**
- Check database for `shipments.documents` JSONB data
- Verify Drive file URLs are accessible
- Check browser console for errors

## � **Benefits of This Approach**

- ✅ **Reuses existing infrastructure**
- ✅ **Maintains security model**
- ✅ **No additional authentication needed**
- ✅ **Consistent with current system**
- ✅ **Easy to maintain and debug**

The implementation is **99% complete** - you just need to add Drive scope handling to your existing Edge Function! 🎉
