import React, { createContext, useContext, useState, useEffect } from 'react';
import { GmailLabel } from '../types';
import { fetchGmailLabels, createGmailLabel, updateGmailLabel, deleteGmailLabel } from '../integrations/gapiService';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { useSecurity } from './SecurityContext';

interface LabelContextType {
  labels: GmailLabel[];
  loadingLabels: boolean;
  refreshLabels: () => Promise<void>;
  error: string | null;
  addLabel: (name: string) => Promise<void>;
  editLabel: (id: string, newName: string) => Promise<void>;
  deleteLabel: (id: string) => Promise<void>;
  isAddingLabel: boolean;
  addLabelError: string | null;
  isEditingLabel: boolean;
  editLabelError: string | null;
  isDeletingLabel: boolean;
  deleteLabelError: string | null;
}

const LabelContext = createContext<LabelContextType | undefined>(undefined);

export function LabelProvider({ children }: { children: React.ReactNode }) {
  const [labels, setLabels] = useState<GmailLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [addLabelError, setAddLabelError] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelError, setEditLabelError] = useState<string | null>(null);
  const [isDeletingLabel, setIsDeletingLabel] = useState(false);
  const [deleteLabelError, setDeleteLabelError] = useState<string | null>(null);
  const { isGmailSignedIn, isGmailApiReady } = useAuth();
  const { currentProfile } = useProfile();
  const { isDataLoadingAllowed } = useSecurity();

  const refreshLabels = async () => {
    // SECURITY: Block label refresh if data loading is not allowed
    if (!isDataLoadingAllowed) {
      console.log('refreshLabels: Blocked by security policy');
      setLabels([]);
      setLoadingLabels(false);
      setError(null);
      return;
    }

    // Only fetch labels if Gmail is signed in, API is ready, AND we have a current profile
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      console.log(`Skipping label refresh - isGmailSignedIn: ${isGmailSignedIn}, isGmailApiReady: ${isGmailApiReady}, currentProfile: ${currentProfile?.name || 'none'}`);
      setLabels([]);
      setLoadingLabels(false);
      setError(null);
      return;
    }

    try {
      setLoadingLabels(true);
      setError(null);
      console.log(`Fetching Gmail labels for profile: ${currentProfile.name} (API Ready: ${isGmailApiReady})`);
      
      const fetchedLabels = await fetchGmailLabels();
      
      // Filter to show only relevant labels (system labels like INBOX, SENT, etc. and user labels)
      const filteredLabels = fetchedLabels.filter(label => {
        // Include user-created labels
        if (label.type === 'user') return true;
        
        // Include important system labels but exclude some we already handle elsewhere
        const includedSystemLabels = ['STARRED', 'IMPORTANT', 'SPAM', 'CATEGORY_PERSONAL', 'CATEGORY_SOCIAL', 'CATEGORY_PROMOTIONS', 'CATEGORY_UPDATES', 'CATEGORY_FORUMS'];
        return includedSystemLabels.includes(label.id);
      });
      
      // Sort labels: system labels first, then user labels alphabetically
      const sortedLabels = filteredLabels.sort((a, b) => {
        if (a.type === 'system' && b.type === 'user') return -1;
        if (a.type === 'user' && b.type === 'system') return 1;
        return a.name.localeCompare(b.name);
      });
      
      setLabels(sortedLabels);
      console.log(`Successfully fetched ${sortedLabels.length} labels for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error fetching Gmail labels:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch labels');
      setLabels([]);
    } finally {
      setLoadingLabels(false);
    }
  };

  const addLabel = async (name: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsAddingLabel(true);
      setAddLabelError(null);
      console.log(`Adding Gmail label: ${name} for profile: ${currentProfile.name}`);
      
      await createGmailLabel(name);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully added label: ${name} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error adding Gmail label:', err);
      setAddLabelError(err instanceof Error ? err.message : 'Failed to add label');
      throw err;
    } finally {
      setIsAddingLabel(false);
    }
  };

  const editLabel = async (id: string, newName: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsEditingLabel(true);
      setEditLabelError(null);
      console.log(`Editing Gmail label ${id} to: ${newName} for profile: ${currentProfile.name}`);
      
      await updateGmailLabel(id, newName);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully edited label to: ${newName} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error editing Gmail label:', err);
      setEditLabelError(err instanceof Error ? err.message : 'Failed to edit label');
      throw err;
    } finally {
      setIsEditingLabel(false);
    }
  };

  const deleteLabel = async (id: string) => {
    if (!isGmailSignedIn || !isGmailApiReady || !currentProfile) {
      throw new Error('Gmail API not ready or no profile selected');
    }

    try {
      setIsDeletingLabel(true);
      setDeleteLabelError(null);
      console.log(`Deleting Gmail label: ${id} for profile: ${currentProfile.name}`);
      
      await deleteGmailLabel(id);
      await refreshLabels(); // Refresh the labels list
      
      console.log(`Successfully deleted label: ${id} for profile: ${currentProfile.name}`);
    } catch (err) {
      console.error('Error deleting Gmail label:', err);
      setDeleteLabelError(err instanceof Error ? err.message : 'Failed to delete label');
      throw err;
    } finally {
      setIsDeletingLabel(false);
    }
  };

  // Refresh labels when Gmail API becomes ready OR when the current profile changes
  // This ensures we only fetch labels when the API is properly configured for the current profile
  useEffect(() => {
    console.log(`Label refresh triggered - isGmailSignedIn: ${isGmailSignedIn}, isGmailApiReady: ${isGmailApiReady}, currentProfile: ${currentProfile?.name || 'none'}`);
    refreshLabels();
  }, [isGmailSignedIn, isGmailApiReady, currentProfile?.id, isDataLoadingAllowed]); // Depend on security policy

  const value = {
    labels,
    loadingLabels,
    refreshLabels,
    error,
    addLabel,
    editLabel,
    deleteLabel,
    isAddingLabel,
    addLabelError,
    isEditingLabel,
    editLabelError,
    isDeletingLabel,
    deleteLabelError
  };

  return <LabelContext.Provider value={value}>{children}</LabelContext.Provider>;
}

export function useLabel() {
  const context = useContext(LabelContext);
  if (context === undefined) {
    throw new Error('useLabel must be used within a LabelProvider');
  }
  return context;
}