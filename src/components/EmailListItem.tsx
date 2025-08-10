import { format, parseISO } from 'date-fns';
import { Email } from '../types';
import { Paperclip, Mail, MailOpen, Star, Trash2, Tag, Filter, ChevronRight, Search, Settings, X, Plus } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { markAsRead, markAsUnread, markAsImportant, markAsUnimportant, deleteDraft, deleteEmail, applyLabelsToEmail } from '../services/emailService';
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useLabel } from '../contexts/LabelContext';
import { useFilterCreation } from '../contexts/FilterCreationContext';

interface EmailListItemProps {
  email: Email;
  onClick: (id: string) => void;
  isDraggable?: boolean;
  onEmailUpdate?: (email: Email) => void;
  onEmailDelete?: (emailId: string) => void;
  isDraft?: boolean;
  currentTab?: 'all' | 'unread' | 'sent' | 'drafts' | 'trash' | 'important';
  onCreateFilter?: (email: Email) => void;
}

function EmailListItem({ email, onClick, isDraggable = true, onEmailUpdate, onEmailDelete, isDraft = false, currentTab, onCreateFilter }: EmailListItemProps) {
  const navigate = useNavigate();
  const { startFilterCreation } = useFilterCreation();
  const [isToggling, setIsToggling] = useState(false);
  const [isTogglingImportance, setIsTogglingImportance] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; show: boolean }>({ x: 0, y: 0, show: false });
  const [showLabelSubmenu, setShowLabelSubmenu] = useState(false);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [showCreateFilterModal, setShowCreateFilterModal] = useState(false);
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [filterLabelQuery, setFilterLabelQuery] = useState('');
  const [selectedFilterLabel, setSelectedFilterLabel] = useState<string>('');
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);
  const filterModalRef = useRef<HTMLDivElement>(null);
  const { labels } = useLabel();
  const formattedDate = format(parseISO(email.date), 'dd/MM/yy');
  
  // Filter labels based on search query
  const filteredLabels = labels.filter(label => 
    label.name.toLowerCase().includes(labelSearchQuery.toLowerCase())
  );
  
  // Filter labels for the filter modal
  const filteredFilterLabels = labels.filter(label => 
    label.name.toLowerCase().includes(filterLabelQuery.toLowerCase())
  );

  // Get user-visible labels for this email (excluding system labels)
  const getUserVisibleLabels = () => {
    if (!email.labelIds || email.labelIds.length === 0) return [];
    
    const systemLabels = ['INBOX', 'SENT', 'DRAFT', 'TRASH', 'SPAM', 'IMPORTANT', 'STARRED', 'UNREAD'];
    
    return email.labelIds
      .filter(labelId => !systemLabels.includes(labelId))
      .map(labelId => {
        // Find the label name from the labels context
        const labelInfo = labels.find(label => label.id === labelId);
        return labelInfo ? { id: labelId, name: labelInfo.name } : null;
      })
      .filter(Boolean) as { id: string; name: string }[];
  };

  const visibleLabels = getUserVisibleLabels();
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: email.id,
    disabled: !isDraggable
  });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const handleToggleReadStatus = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    setIsToggling(true);
    
    const newReadStatus = !email.isRead;
    
    // Optimistic UI update - immediately update the UI
    const updatedEmail = { ...email, isRead: newReadStatus };
    onEmailUpdate?.(updatedEmail);
    
    try {
      if (email.isRead) {
        await markAsUnread(email.id);
      } else {
        await markAsRead(email.id);
      }
      
      console.log(`✅ Successfully toggled read status for email ${email.id} to ${newReadStatus ? 'read' : 'unread'}`);
      
    } catch (error) {
      console.error('Error toggling read status:', error);
      
      // Revert the optimistic update on error
      const revertedEmail = { ...email, isRead: email.isRead };
      onEmailUpdate?.(revertedEmail);
    } finally {
      setIsToggling(false);
    }
  };

  const handleToggleImportance = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    setIsTogglingImportance(true);
    
    const currentImportantStatus = email.isImportant ?? false; // Default to false if undefined
    const newImportantStatus = !currentImportantStatus;
    
    // Optimistic UI update - immediately update the UI
    const updatedEmail = { ...email, isImportant: newImportantStatus };
    onEmailUpdate?.(updatedEmail);
    
    try {
      if (currentImportantStatus) {
        await markAsUnimportant(email.id);
      } else {
        await markAsImportant(email.id);
      }
      
      console.log(`⭐ Successfully toggled importance for email ${email.id} to ${newImportantStatus ? 'important' : 'not important'}`);
      
    } catch (error) {
      console.error('Error toggling importance:', error);
      
      // Revert the optimistic update on error
      const revertedEmail = { ...email, isImportant: currentImportantStatus };
      onEmailUpdate?.(revertedEmail);
    } finally {
      setIsTogglingImportance(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }
    
    setIsDeleting(true);
    
    try {
      await deleteDraft(email.id);
      onEmailDelete?.(email.id);
      console.log(`✅ Successfully deleted draft ${email.id}`);
    } catch (error) {
      console.error('Error deleting draft:', error);
      alert('Failed to delete draft. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEmail = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent email click
    
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }
    
    setIsDeletingEmail(true);
    
    try {
      await deleteEmail(email.id);
      onEmailDelete?.(email.id);
      console.log(`✅ Successfully deleted email ${email.id}`);
    } catch (error) {
      console.error('Error deleting email:', error);
      alert('Failed to delete email. Please try again.');
    } finally {
      setIsDeletingEmail(false);
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the exact mouse position relative to the viewport
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Estimated menu dimensions
    const menuWidth = 200; // min-w-48 = 192px + padding
    const menuHeight = 120; // Approximate height for 2 items
    
    // Calculate position - start exactly where mouse clicked
    let x = mouseX;
    let y = mouseY;
    
    // Adjust if menu would go off-screen to the right
    if (x + menuWidth > viewportWidth) {
      x = mouseX - menuWidth; // Show to the left of cursor
    }
    
    // Adjust if menu would go off-screen at the bottom
    if (y + menuHeight > viewportHeight) {
      y = mouseY - menuHeight; // Show above cursor
    }
    
    // Ensure menu doesn't go off the left or top edges
    x = Math.max(4, x);
    y = Math.max(4, y);
    
    console.log('Context menu position:', { mouseX, mouseY, x, y });
    
    setContextMenu({
      x,
      y,
      show: true
    });
  };

  // Handle clicking outside context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
      
      // Handle clicking outside filter modal
      if (filterModalRef.current && !filterModalRef.current.contains(event.target as Node) && showCreateFilterModal) {
        handleCloseCreateFilterModal();
      }
    };

    const handleScroll = () => {
      // Close context menu on scroll to avoid positioning issues
      if (contextMenu.show) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
    };

    const handleResize = () => {
      // Close context menu on window resize
      if (contextMenu.show) {
        setContextMenu({ x: 0, y: 0, show: false });
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery(''); // Clear search when closing
      }
    };

    if (contextMenu.show || showCreateFilterModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true); // Use capture to catch all scroll events
      window.addEventListener('resize', handleResize);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [contextMenu.show]);

  // Handle applying label to email
  const handleApplyLabel = async (labelId: string) => {
    setIsApplyingLabel(labelId);
    try {
      await applyLabelsToEmail(email.id, [labelId]);
      setContextMenu({ x: 0, y: 0, show: false });
      setShowLabelSubmenu(false);
      setLabelSearchQuery(''); // Clear search when applying label
      // Could add a toast notification here
    } catch (error) {
      console.error('Error applying label:', error);
      alert('Failed to apply label. Please try again.');
    } finally {
      setIsApplyingLabel(null);
    }
  };

  // Handle manage filters navigation
  const handleManageFilters = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    setShowFilterSubmenu(false);
    navigate('/settings?tab=filters');
  };

  // Handle create new filter modal
  const handleCreateNewFilter = () => {
    setContextMenu({ x: 0, y: 0, show: false });
    setShowFilterSubmenu(false);
    setShowCreateFilterModal(true);
  };

  // Handle filter submenu show/hide
  const handleShowFilterSubmenu = () => {
    setShowFilterSubmenu(true);
  };

  const handleHideFilterSubmenu = () => {
    setShowFilterSubmenu(false);
  };

  // Handle create filter modal
  const handleCloseCreateFilterModal = () => {
    setShowCreateFilterModal(false);
    setFilterLabelQuery('');
    setSelectedFilterLabel('');
  };

  const handleCreateFilterWithLabel = () => {
    if (!selectedFilterLabel) {
      console.warn('No label selected for filter creation');
      return;
    }
    
    // Close the modal first
    handleCloseCreateFilterModal();
    
    // Use the same logic as the simple filter creation but with label info
    console.log('Creating filter for email from:', email.from.email, 'with label:', selectedFilterLabel);
    
    // Call the parent's filter creation handler with the email
    onCreateFilter?.(email);
  };

  const handleSelectFilterLabel = (_labelId: string, labelName: string) => {
    setSelectedFilterLabel(labelName);
    setFilterLabelQuery(labelName);
  };

  const handleCreateNewLabel = () => {
    if (filterLabelQuery.trim()) {
      // Here you would implement label creation logic
      console.log('Creating new label:', filterLabelQuery);
      setSelectedFilterLabel(filterLabelQuery);
    }
  };

  // Handle more options - use context to store email data and navigate
  const handleMoreOptions = () => {
    // Close the modal first
    handleCloseCreateFilterModal();
    
    // Store the email data in context for the settings page to use
    startFilterCreation(email);
    
    // Navigate to settings filters tab
    navigate('/settings?tab=filters');
  };

  // Handle label submenu show/hide
  const handleShowLabelSubmenu = () => {
    setShowLabelSubmenu(true);
    // Focus search input after submenu is shown
    setTimeout(() => {
      labelSearchRef.current?.focus();
    }, 50);
  };

  const handleHideLabelSubmenu = () => {
    setShowLabelSubmenu(false);
    setLabelSearchQuery(''); // Clear search when hiding submenu
  };

  return (
    <>
      <div 
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => onClick(email.id)}
        onContextMenu={handleContextMenu}
        className={`group px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${
          !email.isRead 
            ? 'bg-blue-50 border-l-4 border-l-blue-600 hover:bg-blue-100/60' 
            : 'bg-white hover:bg-gray-50'
        } ${isDragging ? 'opacity-50 z-10' : ''} min-w-0`}
        data-dragging={isDragging}
      >
      <div className="flex items-start justify-between min-w-0">
        <div className="flex-1 min-w-0 mr-6 overflow-hidden">
          {/* Sender/Recipient Name */}
          <div className="flex items-center mb-1 min-w-0">
            <span className={`text-sm ${!email.isRead ? 'font-extrabold text-gray-900' : 'font-medium text-gray-800'} truncate flex-1 min-w-0`}>
              {currentTab === 'sent' 
                ? (email.to && email.to.length > 0 
                    ? (email.to[0].name && email.to[0].name !== 'Me' && email.to[0].name.trim() !== ''
                        ? email.to[0].name 
                        : email.to[0].email || 'Unknown recipient')
                    : 'Unknown recipient')
                : (email.from.name || email.from.email)
              }
            </span>
            {!email.isRead && (
              <span className="w-2.5 h-2.5 bg-blue-700 rounded-full flex-shrink-0 ml-2 shadow-md animate-pulse"></span>
            )}
          </div>
          
          {/* Subject */}
          <h3 className={`text-xs ${!email.isRead ? 'font-extrabold text-gray-900' : 'font-normal text-gray-600'} truncate mb-1 leading-relaxed`}>
            {email.subject || 'No Subject'}
          </h3>
          
          {/* Preview */}
          <p className={`text-xs ${!email.isRead ? 'text-gray-700 font-medium' : 'text-gray-500'} truncate leading-relaxed`}>
            {email.preview}
          </p>

          {/* Labels */}
          {visibleLabels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {visibleLabels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded border border-gray-300"
                  title={label.name}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Right side - Date and Actions */}
        <div className="flex flex-col items-end space-y-1 flex-shrink-0 ml-4">
          <span className="text-xs text-gray-500 whitespace-nowrap">{formattedDate}</span>
          
          <div className="flex items-center space-x-1">
            {/* Attachment indicator */}
            {email.attachments && email.attachments.length > 0 && (
              <Paperclip size={14} className="text-gray-400" />
            )}
            
            {/* Action buttons */}
            <div className="flex items-center space-x-1 transition-opacity">
              <button
                onClick={handleToggleReadStatus}
                disabled={isToggling}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                  isToggling ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={email.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {email.isRead ? (
                  <MailOpen size={14} className="text-gray-500" />
                ) : (
                  <Mail size={14} className="text-blue-600" />
                )}
              </button>
              
              <button
                onClick={handleToggleImportance}
                disabled={isTogglingImportance}
                className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                  isTogglingImportance ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title={email.isImportant ? 'Mark as unimportant' : 'Mark as important'}
              >
                {email.isImportant ? (
                  <Star size={14} className="text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star size={14} className="text-gray-500 hover:text-yellow-400" />
                )}
              </button>
              
              {/* Delete email button for all users */}
              <button
                onClick={handleDeleteEmail}
                disabled={isDeletingEmail}
                className={`p-1 rounded hover:bg-red-100 transition-colors ${
                  isDeletingEmail ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="Delete email"
              >
                {isDeletingEmail ? (
                  <div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Trash2 size={14} className="text-gray-500 hover:text-gray-700" />
                )}
              </button>
              
              {isDraft && (
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className={`p-1 rounded hover:bg-red-100 transition-colors ${
                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title="Delete draft"
                >
                  {isDeleting ? (
                    <div className="w-3.5 h-3.5 border border-red-500 border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Trash2 size={14} className="text-red-500 hover:text-red-700" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Context Menu - Rendered in Portal */}
      {contextMenu.show && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-48"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: 'translate(0, 0)', // Ensure no transform interferes
          }}
        >
          {/* Add to Label */}
          <div className="relative">
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
              onMouseEnter={handleShowLabelSubmenu}
              onMouseLeave={handleHideLabelSubmenu}
            >
              <div className="flex items-center">
                <Tag size={16} className="mr-3 text-gray-500" />
                Add to Label
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            
            {/* Enhanced Label Submenu with Search */}
            {showLabelSubmenu && (
              <div
                className="absolute left-full top-0 ml-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-56 max-h-80 overflow-hidden"
                onMouseEnter={() => setShowLabelSubmenu(true)}
                onMouseLeave={handleHideLabelSubmenu}
              >
                {/* Search Bar */}
                <div className="p-2 border-b border-gray-100">
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      ref={labelSearchRef}
                      type="text"
                      placeholder="Search labels..."
                      value={labelSearchQuery}
                      onChange={(e) => setLabelSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onClick={(e) => e.stopPropagation()} // Prevent closing on input click
                    />
                  </div>
                </div>
                
                {/* Scrollable Labels List */}
                <div className="max-h-48 overflow-y-auto">
                  {filteredLabels.length > 0 ? (
                    filteredLabels.map(label => (
                      <button
                        key={label.id}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                        onClick={() => handleApplyLabel(label.id)}
                        disabled={isApplyingLabel === label.id}
                      >
                        <div className="w-2 h-2 rounded-full mr-2 bg-blue-500 flex-shrink-0"></div>
                        <span className="truncate">
                          {isApplyingLabel === label.id ? 'Applying...' : label.name}
                        </span>
                      </button>
                    ))
                  ) : labelSearchQuery ? (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      No labels found for "{labelSearchQuery}"
                    </div>
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-500">No labels available</div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Filter Menu */}
          <div className="relative">
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
              onMouseEnter={handleShowFilterSubmenu}
              onMouseLeave={handleHideFilterSubmenu}
            >
              <div className="flex items-center">
                <Filter size={16} className="mr-3 text-gray-500" />
                Filter
              </div>
              <ChevronRight size={14} className="text-gray-400" />
            </button>
            
            {/* Filter Submenu */}
            {showFilterSubmenu && (
              <div
                className="absolute left-full top-0 ml-1 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48"
                onMouseEnter={() => setShowFilterSubmenu(true)}
                onMouseLeave={handleHideFilterSubmenu}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={handleManageFilters}
                >
                  <Settings size={16} className="mr-3 text-gray-500" />
                  Manage Filters
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  onClick={handleCreateNewFilter}
                >
                  <Plus size={16} className="mr-3 text-gray-500" />
                  Create Filter
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Create Filter Modal */}
      {showCreateFilterModal && createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div
            ref={filterModalRef}
            className="bg-white rounded-lg shadow-xl w-96 max-w-[90vw] max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Create a rule</h2>
                <button
                  onClick={handleCloseCreateFilterModal}
                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                >
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-4">
                  Always move messages from <span className="font-semibold">{email.from.name || email.from.email}</span> to this folder:
                </p>
                
                {/* Label Selection Dropdown */}
                <div className="relative">
                  <div className="border border-gray-300 rounded-lg p-3 cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">
                        {selectedFilterLabel || 'Select a folder'}
                      </span>
                      <ChevronRight size={16} className="text-gray-400 transform rotate-90" />
                    </div>
                  </div>
                  
                  {/* Label Search and List */}
                  <div className="mt-2 border border-gray-300 rounded-lg bg-white shadow-lg max-h-60 overflow-hidden">
                    {/* Search Bar */}
                    <div className="p-2 border-b border-gray-100">
                      <div className="relative">
                        <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search for a folder"
                          value={filterLabelQuery}
                          onChange={(e) => setFilterLabelQuery(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 text-sm border-0 focus:ring-0 outline-none"
                        />
                        {filterLabelQuery && (
                          <button
                            onClick={() => setFilterLabelQuery('')}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded"
                          >
                            <X size={12} className="text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Scrollable Labels List */}
                    <div className="max-h-40 overflow-y-auto">
                      {filteredFilterLabels.length > 0 ? (
                        filteredFilterLabels.map(label => (
                          <button
                            key={label.id}
                            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                            onClick={() => handleSelectFilterLabel(label.id, label.name)}
                          >
                            <Tag size={14} className="mr-3 text-gray-400" />
                            <span className="truncate">{label.name}</span>
                          </button>
                        ))
                      ) : filterLabelQuery ? (
                        <div className="px-3 py-4 text-center">
                          <p className="text-sm text-gray-500 mb-2">
                            No labels found for "{filterLabelQuery}"
                          </p>
                          <button
                            onClick={handleCreateNewLabel}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Create new folder "{filterLabelQuery}"
                          </button>
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">No labels available</div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* More Options Link */}
                <button 
                  onClick={handleMoreOptions}
                  className="text-blue-600 hover:text-blue-700 text-sm mt-3 font-medium"
                >
                  More options
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={handleCloseCreateFilterModal}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFilterWithLabel}
                disabled={!selectedFilterLabel}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default EmailListItem;