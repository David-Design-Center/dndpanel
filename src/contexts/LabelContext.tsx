import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { GmailLabel } from '../types';
import { fetchGmailLabels, createGmailLabel, updateGmailLabel, deleteGmailLabel } from '../integrations/gapiService';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { useSecurity } from './SecurityContext';
import { devLog } from '../utils/logging';
import { shouldBlockDataFetches } from '../utils/authFlowUtils';

interface LabelContextType {
  labels: GmailLabel[];
  loadingLabels: boolean;
  refreshLabels: () => Promise<void>;
  clearLabelsCache: () => void;
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
  
  // Cache to prevent duplicate API calls when switching tabs/pages
  const labelsCache = useRef<{[profileId: string]: { labels: GmailLabel[], timestamp: number }}>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [addLabelError, setAddLabelError] = useState<string | null>(null);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editLabelError, setEditLabelError] = useState<string | null>(null);
  const [isDeletingLabel, setIsDeletingLabel] = useState(false);
  const [deleteLabelError, setDeleteLabelError] = useState<string | null>(null);
  const { isGmailSignedIn, isGmailApiReady } = useAuth();
  const { currentProfile, authFlowCompleted } = useProfile();
  const { isDataLoadingAllowed } = useSecurity();
  const location = useLocation();

  const refreshLabels = useCallback(async () => {
    // Security check: Block all data fetches during auth flow
    if (shouldBlockDataFetches(location.pathname)) {
      return;
    }

    // Double check with authFlowCompleted state
    if (!authFlowCompleted) {
      return;
    }

    // Ensure we have current profile and Gmail is ready
    if (!currentProfile) {
      return;
    }

    if (!isGmailSignedIn || !isGmailApiReady) {
      return;
    }

    // Check security context
    if (!isDataLoadingAllowed) {
      return;
    }

    // Check cache first to prevent unnecessary API calls
    const cacheKey = currentProfile.name;
    const cached = labelsCache.current[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setLabels(cached.labels);
      return;
    }

    try {
      setLoadingLabels(true);
      setError(null);
      
      const gmailLabels = await fetchGmailLabels();
      
      // Debug: Log labels with counts (only those with counts to reduce noise)
      const labelsWithCounts = gmailLabels.filter(label => 
        (label.messagesUnread || 0) > 0 || (label.messagesTotal || 0) > 0
      );
      console.log('Labels with counts:', labelsWithCounts.map(label => ({
        name: label.name,
        messagesUnread: label.messagesUnread,
        messagesTotal: label.messagesTotal
      })));
      
      setLabels(gmailLabels);
      
      // Cache the result
      labelsCache.current[cacheKey] = {
        labels: gmailLabels,
        timestamp: Date.now()
      };
      
    } catch (err) {
      console.error('Error fetching Gmail labels:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch labels';
      setError(errorMessage);
      
      // Don't clear existing labels on error, keep showing what we have
      // This prevents the UI from going blank during rate limit errors
    } finally {
      setLoadingLabels(false);
    }
  }, [isGmailSignedIn, isGmailApiReady, currentProfile?.id, isDataLoadingAllowed, authFlowCompleted]); // Removed location.pathname to prevent unnecessary refreshes on navigation

  const clearLabelsCache = () => {
    labelsCache.current = {};
    setLabels([]);
    setError(null);
    setLoadingLabels(false);
    setAddLabelError(null);
    setEditLabelError(null);
    setDeleteLabelError(null);
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
    devLog.debug(`Label refresh triggered`);
    refreshLabels();
  }, [isGmailSignedIn, isGmailApiReady, currentProfile?.id, isDataLoadingAllowed]); // Depend on security policy

  // Listen for profile switches and clear cache
  useEffect(() => {
    const handleClearCache = () => {
      clearLabelsCache();
    };

    window.addEventListener('clear-all-caches', handleClearCache as EventListener);
    return () => {
      window.removeEventListener('clear-all-caches', handleClearCache as EventListener);
    };
  }, [clearLabelsCache]);

  const value = {
    labels,
    loadingLabels,
    refreshLabels,
    clearLabelsCache,
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