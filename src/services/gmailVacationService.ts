import { supabase } from '../lib/supabase';
import { isGmailSignedIn } from '../integrations/gapiService';
import { queueGmailRequest } from '../utils/requestQueue';

// Gmail Vacation Responder Service
// Uses Gmail's built-in vacation responder instead of custom auto-reply logic

export interface VacationSettings {
  enableAutoReply: boolean;
  responseSubject?: string;
  responseBodyPlainText?: string;
  responseBodyHtml?: string;
  restrictToContacts?: boolean;
  restrictToDomain?: boolean;
  startTime?: number; // epoch ms (optional start date)
  endTime?: number; // epoch ms (optional end date)
}

export interface VacationFormData {
  enableAutoReply: boolean;
  responseSubject: string;
  responseBodyHtml: string;
  restrictToContacts: boolean;
  restrictToDomain: boolean;
  useStartDate: boolean;
  startDate?: string; // YYYY-MM-DD format
  useEndDate: boolean;
  endDate?: string; // YYYY-MM-DD format
}

/**
 * Convert VacationFormData to VacationSettings
 */
export const convertFormDataToSettings = (formData: VacationFormData): VacationSettings => {
  const settings: VacationSettings = {
    enableAutoReply: formData.enableAutoReply,
    responseSubject: formData.responseSubject || 'Out of Office',
    responseBodyHtml: formData.responseBodyHtml,
    restrictToContacts: formData.restrictToContacts,
    restrictToDomain: formData.restrictToDomain
  };

  // Convert dates to epoch milliseconds
  if (formData.useStartDate && formData.startDate) {
    const startDate = new Date(formData.startDate);
    settings.startTime = startDate.getTime();
  }

  if (formData.useEndDate && formData.endDate) {
    const endDate = new Date(formData.endDate);
    // Set to end of day (23:59:59)
    endDate.setHours(23, 59, 59, 999);
    settings.endTime = endDate.getTime();
  }

  return settings;
};

/**
 * Convert VacationSettings to VacationFormData
 */
export const convertSettingsToFormData = (settings: VacationSettings): VacationFormData => {
  const formData: VacationFormData = {
    enableAutoReply: settings.enableAutoReply,
    responseSubject: settings.responseSubject || 'Out of Office',
    responseBodyHtml: settings.responseBodyHtml || '',
    restrictToContacts: settings.restrictToContacts || false,
    restrictToDomain: settings.restrictToDomain || false,
    useStartDate: !!settings.startTime,
    useEndDate: !!settings.endTime
  };

  // Convert epoch milliseconds to date strings
  if (settings.startTime) {
    const startDate = new Date(settings.startTime);
    formData.startDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  if (settings.endTime) {
    const endDate = new Date(settings.endTime);
    formData.endDate = endDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  return formData;
};

/**
 * Get Gmail's vacation responder settings
 */
export const getGmailVacationSettings = async (): Promise<VacationSettings | null> => {
  try {
    // Check if Gmail API is ready and user is signed in
    if (!isGmailSignedIn() || !window.gapi?.client?.gmail) {
      console.log('Gmail API not ready or user not signed in - vacation settings unavailable');
      return null;
    }

    console.log('Getting Gmail vacation responder settings...');

    // Wrap with queue wrapper to handle rate limits
    const response = await queueGmailRequest('get-vacation-settings', () =>
      window.gapi.client.gmail.users.settings.getVacation({
        userId: 'me'
      })
    );

    if (!response.result) {
      console.warn('No vacation settings returned from Gmail API');
      return null;
    }

    const settings: VacationSettings = {
      enableAutoReply: response.result.enableAutoReply || false,
      responseSubject: response.result.responseSubject || '',
      responseBodyPlainText: response.result.responseBodyPlainText || '',
      responseBodyHtml: response.result.responseBodyHtml || '',
      restrictToContacts: response.result.restrictToContacts || false,
      restrictToDomain: response.result.restrictToDomain || false,
      startTime: response.result.startTime ? parseInt(response.result.startTime) : undefined,
      endTime: response.result.endTime ? parseInt(response.result.endTime) : undefined
    };

    console.log('Gmail vacation settings retrieved:', settings);
    return settings;
  } catch (error) {
    console.error('Error getting Gmail vacation settings:', error);
    return null;
  }
};

/**
 * Update Gmail's vacation responder settings with full configuration
 */
export const updateGmailVacationSettings = async (settings: VacationSettings): Promise<boolean> => {
  try {
    if (!window.gapi?.client?.gmail) {
      throw new Error('Gmail API not initialized');
    }

    console.log('Updating Gmail vacation responder settings:', settings);

    const requestBody: any = {
      enableAutoReply: settings.enableAutoReply,
      responseSubject: settings.responseSubject || '',
      responseBodyHtml: settings.responseBodyHtml || '',
      restrictToContacts: settings.restrictToContacts || false,
      restrictToDomain: settings.restrictToDomain || false
    };

    // Add plain text version if HTML is provided
    if (settings.responseBodyHtml) {
      requestBody.responseBodyPlainText = settings.responseBodyHtml
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
    }

    // Add timing if specified
    if (settings.startTime) {
      requestBody.startTime = settings.startTime.toString();
    }
    if (settings.endTime) {
      requestBody.endTime = settings.endTime.toString();
    }

    const response = await queueGmailRequest('update-vacation-settings', () =>
      window.gapi.client.gmail.users.settings.updateVacation({
        userId: 'me',
        resource: requestBody
      })
    );

    if (!response.result) {
      throw new Error('Failed to update Gmail vacation settings');
    }

    console.log('Gmail vacation settings updated successfully:', response.result);
    return true;
  } catch (error) {
    console.error('Error updating Gmail vacation settings:', error);
    return false;
  }
};

/**
 * Enable Gmail vacation responder with full configuration
 */
export const enableGmailVacationResponder = async (
  formData: VacationFormData
): Promise<boolean> => {
  try {
    const vacationSettings: VacationSettings = {
      enableAutoReply: true,
      responseSubject: formData.responseSubject || 'Out of Office',
      responseBodyHtml: formData.responseBodyHtml,
      restrictToContacts: formData.restrictToContacts,
      restrictToDomain: formData.restrictToDomain
    };

    // Convert dates to epoch milliseconds
    if (formData.useStartDate && formData.startDate) {
      const startDate = new Date(formData.startDate);
      vacationSettings.startTime = startDate.getTime();
    }

    if (formData.useEndDate && formData.endDate) {
      const endDate = new Date(formData.endDate);
      // Set to end of day (23:59:59)
      endDate.setHours(23, 59, 59, 999);
      vacationSettings.endTime = endDate.getTime();
    }

    const success = await updateGmailVacationSettings(vacationSettings);

    if (success) {
      console.log('✅ Gmail vacation responder enabled with configuration:', vacationSettings);
    }

    return success;
  } catch (error) {
    console.error('Error enabling Gmail vacation responder:', error);
    return false;
  }
};

/**
 * Disable Gmail vacation responder
 */
export const disableGmailVacationResponder = async (): Promise<boolean> => {
  try {
    const vacationSettings: VacationSettings = {
      enableAutoReply: false,
      responseSubject: '',
      responseBodyHtml: '',
      restrictToContacts: false,
      restrictToDomain: false
    };

    const success = await updateGmailVacationSettings(vacationSettings);

    if (success) {
      console.log('✅ Gmail vacation responder disabled');
    }

    return success;
  } catch (error) {
    console.error('Error disabling Gmail vacation responder:', error);
    return false;
  }
};

/**
 * Update Supabase to reflect out-of-office status (optional, for cross-device sync)
 */
const updateSupabaseOutOfOfficeStatus = async (profileName: string, isOutOfOffice: boolean): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('out_of_office_settings')
      .eq('name', profileName)
      .single();

    if (error) {
      console.error('Error fetching profile settings:', error);
      return;
    }

    const currentSettings = data?.out_of_office_settings || {};
    const updatedSettings = {
      ...currentSettings,
      isOutOfOffice: isOutOfOffice
    };

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ out_of_office_settings: updatedSettings })
      .eq('name', profileName);

    if (updateError) {
      console.error('Error updating profile out-of-office status:', updateError);
    } else {
      console.log(`✅ Updated Supabase out-of-office status for ${profileName}: ${isOutOfOffice}`);
    }
  } catch (error) {
    console.error('Error updating Supabase out-of-office status:', error);
  }
};

/**
 * Check if Gmail vacation responder is currently active
 */
export const isGmailVacationResponderActive = async (): Promise<boolean> => {
  try {
    const settings = await getGmailVacationSettings();
    return settings?.enableAutoReply || false;
  } catch (error) {
    console.error('Error checking Gmail vacation responder status:', error);
    return false;
  }
};

/**
 * Sync Gmail vacation responder status with Supabase (optional)
 * This should be called periodically to ensure consistency
 */
export const syncGmailVacationStatusWithSupabase = async (profileName: string): Promise<void> => {
  try {
    const gmailVacationActive = await isGmailVacationResponderActive();
    await updateSupabaseOutOfOfficeStatus(profileName, gmailVacationActive);
    console.log(`✅ Synced Gmail vacation status with Supabase for ${profileName}: ${gmailVacationActive}`);
  } catch (error) {
    console.error('Error syncing Gmail vacation status with Supabase:', error);
  }
};

/**
 * Get default vacation form data
 */
export const getDefaultVacationFormData = (): VacationFormData => {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];

  return {
    enableAutoReply: true,
    responseSubject: 'Out of Office',
    responseBodyHtml: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you for your understanding.</p>
      </div>
    `,
    restrictToContacts: false,
    restrictToDomain: false,
    useStartDate: false,
    startDate: todayString,
    useEndDate: false,
    endDate: todayString
  };
};
