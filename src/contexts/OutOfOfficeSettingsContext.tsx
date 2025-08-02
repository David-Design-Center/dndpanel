import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useProfile } from './ProfileContext';
import { devLog } from '../utils/logging';
import { OutOfOfficeSettings } from '../types';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

interface OutOfOfficeSettingsContextType {
  settings: { [profileName: string]: OutOfOfficeSettings };
  updateSettings: (profileName: string, settings: OutOfOfficeSettings) => Promise<void>;
  getSettingsForProfile: (profileName: string) => OutOfOfficeSettings;
  isLoading: boolean;
  error: string | null;
}

const OutOfOfficeSettingsContext = createContext<OutOfOfficeSettingsContextType | undefined>(undefined);

const defaultSettings: OutOfOfficeSettings = {
  isOutOfOffice: false,
  autoReplyMessage: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <p>Hi,</p>
      <p>I'm out of office currently. I'll get back to you when I return.</p>
      <p>Thank you for your understanding.</p>
    </div>
  `.trim()
};

// Default settings for each profile
const profileDefaults: { [profileName: string]: OutOfOfficeSettings } = {
  'David': {
    isOutOfOffice: false,
    autoReplyMessage: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you, have a blessed day.</p>
        <p>David</p>
      </div>
    `.trim()
  },
  'Marti': {
    isOutOfOffice: false,
    autoReplyMessage: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you for your understanding.</p>
        <p>Marti</p>
      </div>
    `.trim()
  },
  'Natalia': {
    isOutOfOffice: false,
    autoReplyMessage: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you for your understanding.</p>
        <p>Natalia</p>
      </div>
    `.trim()
  },
  'Dimitry': {
    isOutOfOffice: false,
    autoReplyMessage: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <p>Hi,</p>
        <p>I'm out of office currently. I'll get back to you when I return.</p>
        <p>Thank you for your understanding.</p>
        <p>Dimitry</p>
      </div>
    `.trim()
  }
};

export function OutOfOfficeSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<{ [profileName: string]: OutOfOfficeSettings }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profiles, authFlowCompleted } = useProfile();
  const location = useLocation();

  // Load settings from Supabase when profiles are available
  useEffect(() => {
    const loadSettings = async () => {
      // Security check: Block all data fetches during auth flow
      if (shouldBlockDataFetches(location.pathname)) {
        return;
      }

      // Double check with authFlowCompleted state
      if (!authFlowCompleted) {
        return;
      }
      
      if (!profiles || profiles.length === 0) {
        return;
      }
      
      // Check if we have any of the target profiles
      const targetProfiles = profiles.filter(p => 
        p.name === 'David' || p.name === 'Marti' || p.name === 'Natalia' || p.name === 'Dimitry'
      );
      if (targetProfiles.length === 0) {
        devLog.debug('OutOfOfficeSettingsContext: No target profiles found, skipping load');
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        // For now, use default settings since the DB column doesn't exist
        // TODO: Create migration to add out_of_office_settings column
        devLog.debug('OutOfOfficeSettingsContext: Using default settings (DB column not available)');
        
        const loadedSettings: { [profileName: string]: OutOfOfficeSettings } = {};
        targetProfiles.forEach(profile => {
          loadedSettings[profile.name] = profileDefaults[profile.name] || defaultSettings;
        });

        setSettings(loadedSettings);
      } catch (err) {
        devLog.debug('OutOfOfficeSettingsContext: Database column missing, using defaults');
        setError(null); // Don't set error for this non-critical failure
        // Fallback to profile defaults
        const fallbackSettings: { [profileName: string]: OutOfOfficeSettings } = {};
        profiles.forEach(profile => {
          if (['David', 'Marti', 'Natalia', 'Dimitry'].includes(profile.name)) {
            fallbackSettings[profile.name] = profileDefaults[profile.name] || defaultSettings;
          }
        });
        setSettings(fallbackSettings);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [profiles]);

  const updateSettings = async (profileName: string, newSettings: OutOfOfficeSettings): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          out_of_office_settings: newSettings 
        })
        .eq('name', profileName);

      if (updateError) {
        throw updateError;
      }

      // Update local state after successful database update
      setSettings(prev => ({
        ...prev,
        [profileName]: newSettings
      }));
    } catch (err) {
      console.error('Error updating out-of-office settings:', err);
      setError('Failed to save out-of-office settings');
      throw err; // Re-throw to let the component handle the error
    } finally {
      setIsLoading(false);
    }
  };

  const getSettingsForProfile = (profileName: string): OutOfOfficeSettings => {
    // Return loaded settings if they exist
    if (settings[profileName]) {
      return settings[profileName];
    }
    
    // Return profile-specific defaults if available
    if (profileDefaults[profileName]) {
      return profileDefaults[profileName];
    }
    
    // Return generic defaults
    return defaultSettings;
  };

  return (
    <OutOfOfficeSettingsContext.Provider value={{
      settings,
      updateSettings,
      getSettingsForProfile,
      isLoading,
      error
    }}>
      {children}
    </OutOfOfficeSettingsContext.Provider>
  );
}

export function useOutOfOfficeSettings() {
  const context = useContext(OutOfOfficeSettingsContext);
  if (context === undefined) {
    throw new Error('useOutOfOfficeSettings must be used within an OutOfOfficeSettingsProvider');
  }
  return context;
}