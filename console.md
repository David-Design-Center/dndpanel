Shipments.tsx:16 🎯 Shipments page - isAdmin: true
backendApi.ts:1371 Creating new shipment: {ref: 'EXM-112233', eta: '', etd: '', container_n: '', user_id: 'de7eda79-267c-431d-993e-8ae7f4179189'}
backendApi.ts:1395 Successfully created shipment: {id: 155, ref: 'EXM-112233', etd: '', eta: '', container_n: '', …}
shipment-upload-modal.tsx:156 Created shipment: {id: 155, ref: 'EXM-112233', etd: null, eta: null, container_n: ''}
shipment-upload-modal.tsx:159 📤 Uploading 5 file(s) sequentially...
shipment-upload-modal.tsx:162 📤 Uploading file 1/5: ALF UNO  (1).pdf
googleDriveService.ts:196 📂 Verifying shipment 155 exists...
googleDriveService.ts:213 ✅ Shipment verification successful: {id: 155, ref: 'EXM-112233'}
googleDriveService.ts:91 📁 Looking for root folder: "Shipment Documents"
googleDriveService.ts:104 🔍 Root folder search result: {files: Array(1)}
googleDriveService.ts:107 ✅ Found existing root folder: Shipment Documents (ID: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH)
googleDriveService.ts:139 📁 Looking for shipment subfolder: "EXM-112233" in parent: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH
googleDriveService.ts:153 🔍 Subfolder search result for "EXM-112233": {files: Array(0)}
googleDriveService.ts:160 📁 Creating new subfolder: "EXM-112233"
googleDriveService.ts:177 📁 Subfolder creation result: {kind: 'drive#file', id: '1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF', name: 'EXM-112233', mimeType: 'application/vnd.google-apps.folder'}
googleDriveService.ts:218 📁 Using shipment folder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:268 � Saving document to documents table: {id: '65a5b32d-1a53-4c5f-85b0-2ed533c9cfba', shipment_id: 155, file_name: 'ALF UNO  (1).pdf', drive_file_id: '1jly1rkfI0A6sjs8RA6F6IUUOKijS_lAx', drive_file_url: 'https://drive.google.com/file/d/1jly1rkfI0A6sjs8RA6F6IUUOKijS_lAx/view?usp=drivesdk', …}
googleDriveService.ts:290 ✅ Document saved successfully to documents table
shipment-upload-modal.tsx:162 📤 Uploading file 2/5: ALF UNO  (2).pdf
googleDriveService.ts:196 📂 Verifying shipment 155 exists...
googleDriveService.ts:213 ✅ Shipment verification successful: {id: 155, ref: 'EXM-112233'}
googleDriveService.ts:91 📁 Looking for root folder: "Shipment Documents"
googleDriveService.ts:104 🔍 Root folder search result: {files: Array(1)}
googleDriveService.ts:107 ✅ Found existing root folder: Shipment Documents (ID: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH)
googleDriveService.ts:139 📁 Looking for shipment subfolder: "EXM-112233" in parent: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH
googleDriveService.ts:153 🔍 Subfolder search result for "EXM-112233": {files: Array(1)}
googleDriveService.ts:156 ✅ Found existing subfolder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:218 📁 Using shipment folder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:268 � Saving document to documents table: {id: '6a1816ef-aaae-4553-a929-7de4e59c2972', shipment_id: 155, file_name: 'ALF UNO  (2).pdf', drive_file_id: '1qYwMLsntgBWkzYsPq0iwPxr8CnrvqHI9', drive_file_url: 'https://drive.google.com/file/d/1qYwMLsntgBWkzYsPq0iwPxr8CnrvqHI9/view?usp=drivesdk', …}
googleDriveService.ts:290 ✅ Document saved successfully to documents table
shipment-upload-modal.tsx:162 📤 Uploading file 3/5: ALF UNO (1).pdf
googleDriveService.ts:196 📂 Verifying shipment 155 exists...
googleDriveService.ts:213 ✅ Shipment verification successful: {id: 155, ref: 'EXM-112233'}
googleDriveService.ts:91 📁 Looking for root folder: "Shipment Documents"
googleDriveService.ts:104 🔍 Root folder search result: {files: Array(1)}
googleDriveService.ts:107 ✅ Found existing root folder: Shipment Documents (ID: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH)
googleDriveService.ts:139 📁 Looking for shipment subfolder: "EXM-112233" in parent: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH
googleDriveService.ts:153 🔍 Subfolder search result for "EXM-112233": {files: Array(1)}
googleDriveService.ts:156 ✅ Found existing subfolder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:218 📁 Using shipment folder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:268 � Saving document to documents table: {id: '50eeaae4-8b53-44ec-9d59-2c45ba29f00b', shipment_id: 155, file_name: 'ALF UNO (1).pdf', drive_file_id: '12M2B4N5Vhjk6QP-cD112hFxZZ546QIRT', drive_file_url: 'https://drive.google.com/file/d/12M2B4N5Vhjk6QP-cD112hFxZZ546QIRT/view?usp=drivesdk', …}
googleDriveService.ts:290 ✅ Document saved successfully to documents table
shipment-upload-modal.tsx:162 📤 Uploading file 4/5: ALF UNO (2).pdf
googleDriveService.ts:196 📂 Verifying shipment 155 exists...
googleDriveService.ts:213 ✅ Shipment verification successful: {id: 155, ref: 'EXM-112233'}
googleDriveService.ts:91 📁 Looking for root folder: "Shipment Documents"
googleDriveService.ts:104 🔍 Root folder search result: {files: Array(1)}
googleDriveService.ts:107 ✅ Found existing root folder: Shipment Documents (ID: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH)
googleDriveService.ts:139 📁 Looking for shipment subfolder: "EXM-112233" in parent: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH
googleDriveService.ts:153 🔍 Subfolder search result for "EXM-112233": {files: Array(1)}
googleDriveService.ts:156 ✅ Found existing subfolder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:218 📁 Using shipment folder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:268 � Saving document to documents table: {id: '549d13c8-7626-4ebc-afd2-a2d8ca665a60', shipment_id: 155, file_name: 'ALF UNO (2).pdf', drive_file_id: '173y97CImP15QcAOOqtZ2ePtD2y7f6TL5', drive_file_url: 'https://drive.google.com/file/d/173y97CImP15QcAOOqtZ2ePtD2y7f6TL5/view?usp=drivesdk', …}
googleDriveService.ts:290 ✅ Document saved successfully to documents table
shipment-upload-modal.tsx:162 📤 Uploading file 5/5: ALF UNO LACEY (1).pdf
googleDriveService.ts:196 📂 Verifying shipment 155 exists...
googleDriveService.ts:213 ✅ Shipment verification successful: {id: 155, ref: 'EXM-112233'}
googleDriveService.ts:91 📁 Looking for root folder: "Shipment Documents"
googleDriveService.ts:104 🔍 Root folder search result: {files: Array(1)}
googleDriveService.ts:107 ✅ Found existing root folder: Shipment Documents (ID: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH)
googleDriveService.ts:139 📁 Looking for shipment subfolder: "EXM-112233" in parent: 1U2YBneDH3EmaeDSAlgYQIZMdpKDPR3TH
googleDriveService.ts:153 🔍 Subfolder search result for "EXM-112233": {files: Array(1)}
googleDriveService.ts:156 ✅ Found existing subfolder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:218 📁 Using shipment folder: EXM-112233 (ID: 1wgfuA2msQMfFNbWq4zWmB-Z1lEN6W4aF)
googleDriveService.ts:268 � Saving document to documents table: {id: '9dfd4a51-6385-4be9-8148-095854a7516b', shipment_id: 155, file_name: 'ALF UNO LACEY (1).pdf', drive_file_id: '1zqY0VsgQ6oxMDHjsJ60QXw1LBUcCPXks', drive_file_url: 'https://drive.google.com/file/d/1zqY0VsgQ6oxMDHjsJ60QXw1LBUcCPXks/view?usp=drivesdk', …}
googleDriveService.ts:290 ✅ Document saved successfully to documents table
shipment-upload-modal.tsx:175 ✅ Successfully uploaded 5 file(s)
backendApi.ts:1310 Fetching shipments from Supabase
Shipments.tsx:16 🎯 Shipments page - isAdmin: true
backendApi.ts:1330 Successfully fetched 1 shipments from Supabase
Shipments.tsx:95 🔍 Fetching documents for shipment 155...
googleDriveService.ts:303 📂 Fetching documents for shipment 155...
Shipments.tsx:82 🔍 Fetching unassigned documents...
googleDriveService.ts:328 📂 Fetching all documents...
Shipments.tsx:16 🎯 Shipments page - isAdmin: true
googleDriveService.ts:340 📄 Retrieved 5 total documents: (5) [{…}, {…}, {…}, {…}, {…}]
googleDriveService.ts:341 📋 Documents breakdown: {total: 5, assigned: 5, unassigned: 0}
Shipments.tsx:85 📋 Retrieved 0 unassigned documents
googleDriveService.ts:315 📄 Documents for shipment 155: (5) [{…}, {…}, {…}, {…}, {…}]
Shipments.tsx:97 📋 Retrieved 5 documents for shipment 155: (5) [{…}, {…}, {…}, {…}, {…}]
Shipments.tsx:104 ✅ Updated state for shipment 155
Shipments.tsx:16 🎯 Shipments page - isAdmin: true
Shipments.tsx:16 🎯 Shipments page - isAdmin: true
Shipments.tsx:16 🎯 Shipments page - isAdmin: true
