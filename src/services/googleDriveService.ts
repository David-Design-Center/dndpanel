import { supabase } from '../lib/supabase';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
}

export interface ShipmentDocument {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  drive_file_id: string;
  drive_file_url: string;
  uploaded_by: string;
  uploaded_at: string;
}

export class GoogleDriveService {
  private static readonly DRIVE_FOLDER_NAME = 'Shipment Documents';
  private static accessToken: string | null = null;

  /**
   * Initialize Google Drive API with access token
   */
  static async initialize() {
    try {
      // Get the current user's Google access token from your existing auth system
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Initializing Google Drive service...');
      
      // You'll need to implement this based on your existing Google auth setup
      // This should return the Google access token for Drive API
      this.accessToken = await this.getGoogleAccessToken();
      
      console.log('✅ Google Drive service initialized successfully');

      if (!this.accessToken) {
        throw new Error('Google Drive access token not available');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Google Drive service:', error);
      throw error;
    }
  }

  /**
   * Get Google access token using existing Gmail token refresh function
   */
  private static async getGoogleAccessToken(): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      console.log('🔄 Requesting Google Drive access token...');

      // Use your existing token refresh function with Drive scope
      const response = await fetch('https://jvcdxglsoholhgapfpet.supabase.co/functions/v1/refresh-gmail-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: user.email, // Changed from user_id to userEmail
          scope: 'drive' // This tells your function we need Drive scope
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Token refresh failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token received from refresh function');
      }

      console.log('✅ Google Drive access token received');
      return data.access_token;
    } catch (error) {
      console.error('❌ Error getting Google Drive access token:', error);
      throw new Error(`Failed to get Google Drive access token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or get the shipment documents folder in Google Drive
   */
  private static async ensureShipmentFolder(): Promise<string> {
    if (!this.accessToken) await this.initialize();

    console.log(`📁 Looking for folder: "${this.DRIVE_FOLDER_NAME}"`);

    // Search for existing folder
    const searchResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${this.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'&fields=files(id,name)`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    const searchData = await searchResponse.json();
    console.log('🔍 Folder search result:', searchData);
    
    if (searchData.files && searchData.files.length > 0) {
      console.log(`✅ Found existing folder: ${searchData.files[0].name} (ID: ${searchData.files[0].id})`);
      return searchData.files[0].id;
    }

    console.log(`📁 Creating new folder: "${this.DRIVE_FOLDER_NAME}"`);

    // Create folder if it doesn't exist
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: this.DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const createData = await createResponse.json();
    console.log('📁 Folder creation result:', createData);
    return createData.id;
    return createData.id;
  }

  /**
   * Upload a file to Google Drive
   */
  static async uploadFile(
    file: File,
    shipmentId: number,
    userId?: string
  ): Promise<ShipmentDocument> {
    try {
      if (!this.accessToken) await this.initialize();

      const folderId = await this.ensureShipmentFolder();

      // Create file metadata
      const metadata = {
        name: file.name,
        parents: [folderId],
      };

      // Create form data for upload
      const formData = new FormData();
      formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      formData.append('file', file);

      // Upload to Google Drive
      const uploadResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Drive upload failed: ${uploadResponse.statusText}`);
      }

      const driveFile: GoogleDriveFile = await uploadResponse.json();

      // Create document record
      const document: ShipmentDocument = {
        id: crypto.randomUUID(),
        file_name: driveFile.name,
        drive_file_id: driveFile.id,
        drive_file_url: driveFile.webViewLink,
        file_size: parseInt(driveFile.size) || 0,
        file_type: driveFile.mimeType,
        uploaded_by: userId || 'unknown',
        uploaded_at: new Date().toISOString(),
      };

      // Get current shipment documents
      console.log(`📂 Fetching shipment ${shipmentId} for document update...`);
      const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('documents')
        .eq('id', shipmentId)
        .single();

      if (fetchError) {
        console.error('❌ Database fetch error:', fetchError);
        // If database fetch fails, delete the uploaded file from Drive
        await this.deleteFileFromDrive(driveFile.id);
        throw fetchError;
      }

      if (!shipment) {
        console.error(`❌ Shipment ${shipmentId} not found in database!`);
        await this.deleteFileFromDrive(driveFile.id);
        throw new Error(`Shipment ${shipmentId} does not exist`);
      }

      console.log('📄 Current shipment documents:', shipment.documents);

      // Check if this shipment actually exists by doing a separate verification query
      console.log('🔍 Verifying shipment exists with all fields...');
      const { data: verifyShipment, error: verifyError } = await supabase
        .from('shipments')
        .select('id, ref, consignee, documents')
        .eq('id', shipmentId)
        .single();
      
      console.log('✅ Shipment verification:', verifyShipment);
      console.log('❌ Verification error:', verifyError);

      // Add new document to the array
      const currentDocuments = shipment.documents || [];
      const updatedDocuments = [...currentDocuments, document];

      console.log(`💾 Updating shipment ${shipmentId} with new document:`, document);

      // Update shipment with new documents array (simplified - only update documents column)
      const updateResult = await supabase
        .from('shipments')
        .update({ 
          documents: updatedDocuments
        })
        .eq('id', shipmentId)
        .select();

      console.log('📊 Update result:', updateResult);

      if (updateResult.error) {
        console.error('❌ Database update error:', updateResult.error);
        // If database update fails, delete the uploaded file from Drive
        await this.deleteFileFromDrive(driveFile.id);
        throw updateResult.error;
      }

      if (!updateResult.data || updateResult.data.length === 0) {
        console.error('❌ No rows were updated! Check if shipment ID exists:', shipmentId);
        // If no rows updated, delete the uploaded file from Drive
        await this.deleteFileFromDrive(driveFile.id);
        throw new Error(`Shipment ${shipmentId} not found or update failed`);
      }

      console.log('✅ Database updated successfully. Updated rows:', updateResult.data.length);
      console.log('📄 Updated shipment data:', updateResult.data[0]);
      return document;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  /**
   * Get all documents for a specific shipment
   */
  static async getShipmentDocuments(shipmentId: number): Promise<ShipmentDocument[]> {
    try {
      console.log(`📂 Fetching documents for shipment ${shipmentId}...`);
      
      const { data, error } = await supabase
        .from('shipments')
        .select('documents')
        .eq('id', shipmentId)
        .single();

      if (error) {
        console.error(`❌ Error fetching shipment ${shipmentId}:`, error);
        throw error;
      }

      console.log(`📄 Documents for shipment ${shipmentId}:`, data?.documents);

      // Return the documents array or empty array if none exist
      return data?.documents || [];
    } catch (error) {
      console.error('Error fetching shipment documents:', error);
      throw new Error('Failed to fetch shipment documents');
    }
  }

  /**
   * Delete a file from Google Drive
   */
  private static async deleteFileFromDrive(fileId: string): Promise<void> {
    if (!this.accessToken) await this.initialize();

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete file from Drive: ${response.statusText}`);
    }
  }

  /**
   * Delete a document (both from Drive and database)
   */
  static async deleteDocument(documentId: string, shipmentId: number): Promise<void> {
    try {
      // First, get the shipment to find the document
      const { data: shipment, error: fetchError } = await supabase
        .from('shipments')
        .select('documents')
        .eq('id', shipmentId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      const documents = shipment.documents || [];
      const document = documents.find((doc: ShipmentDocument) => doc.id === documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }

      // Delete from Google Drive
      try {
        await this.deleteFileFromDrive(document.drive_file_id);
      } catch (driveError) {
        console.warn('Failed to delete file from Google Drive:', driveError);
        // Continue with database deletion even if Drive deletion fails
      }

      // Remove document from array and update shipment
      const updatedDocuments = documents.filter((doc: ShipmentDocument) => doc.id !== documentId);
      
      const { error: updateError } = await supabase
        .from('shipments')
        .update({ 
          documents: updatedDocuments,
          documents_updated_at: new Date().toISOString()
        })
        .eq('id', shipmentId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  }

  /**
   * Get a direct download link for a file
   */
  static async getDownloadLink(fileId: string): Promise<string> {
    if (!this.accessToken) await this.initialize();

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get download link: ${response.statusText}`);
    }

    const data = await response.json();
    return data.webContentLink;
  }
}
