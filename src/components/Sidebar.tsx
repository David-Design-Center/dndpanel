import { useState, useMemo } from 'react';
import { Inbox, Send, Folder, FileWarning, Trash, MailPlus, AlertCircle, ChevronDown, ChevronRight, Clipboard, FileText, Settings, Tag, Loader2, BarChart3, Package, Calendar, Search, X, Plus, LogOut } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ProfileSelector from './ProfileSelector';
import { useLabel } from '../contexts/LabelContext';
import { useProfile } from '../contexts/ProfileContext';
import { useOutOfOffice } from '../contexts/OutOfOfficeContext';
import { Toggle } from './ui/liquid-toggle';

interface SidebarProps {
  onCompose: () => void;
}

function Sidebar({ onCompose }: SidebarProps) {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [isCreateLabelOpen, setIsCreateLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const { labels, loadingLabels, addLabel, isAddingLabel, addLabelError } = useLabel();
  const { currentProfile, clearProfile } = useProfile();
  const { isOutOfOffice, setOutOfOffice } = useOutOfOffice();
  
  // Filter and clean labels based on search
  const filteredLabels = useMemo(() => {
    // First clean up names and then filter
    const cleanedLabels = labels
      .map(label => ({
        ...label,
        displayName: label.name
          .replace(/^\[Gmail\]\/|^\[Gmail\]\s*›\s*|^Gmail\/|^INBOX\/|^Categories\//i, '') // Remove Gmail prefixes
          .replace(/^--/, '') // Remove leading dashes
          .replace(/\//g, ' › ') // Replace slashes with arrow for hierarchy
          .trim()
      }))
      .filter(label => {
        // Filter out system labels - only exclude exact matches and well-known system labels
        const name = label.name.toLowerCase();
        return name !== 'inbox' && 
               name !== 'sent' && 
               name !== 'drafts' && 
               name !== 'spam' && 
               name !== 'trash' &&
               name !== 'important' &&
               name !== 'starred' &&
               !name.startsWith('category_') &&
               !name.startsWith('label_') &&
               label.displayName.length > 0; // Make sure we have a display name
      });

    // Then filter by search term
    if (!labelSearch.trim()) return cleanedLabels;
    return cleanedLabels.filter(label => 
      label.displayName.toLowerCase().includes(labelSearch.toLowerCase())
    );
  }, [labels, labelSearch]);
  
  // Main item
  const mainItem = { 
    icon: <Inbox size={20} className="text-blue-500" />, 
    label: 'All Mail', 
    path: '/inbox' 
  };
  
  // Dropdown items - conditionally include Trash for specific profile
  const dropdownItems = [
    { icon: <AlertCircle size={20} className="text-green-500" />, label: 'Unread', path: '/unread' },
    { icon: <Send size={20} className="text-blue-500" />, label: 'Sent', path: '/sent' },
    { icon: <FileWarning size={20} className="text-yellow-500" />, label: 'Drafts', path: '/drafts' },
    ...(currentProfile?.name === 'David' ? [
      { icon: <Trash size={20} className="text-gray-500" />, label: 'Trash', path: '/trash' }
    ] : [])
  ];

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleCreateLabel = () => {
    setIsCreateLabelOpen(true);
  };

  const handleLabelCreate = async () => {
    if (newLabelName.trim()) {
      try {
        await addLabel(newLabelName.trim());
        // Reset form only on success
        setNewLabelName('');
        setIsCreateLabelOpen(false);
      } catch (err) {
        // Error is handled in the context, just keep the modal open
        console.error('Failed to create label:', err);
      }
    }
  };

  const handleCancelCreate = () => {
    setNewLabelName('');
    setIsCreateLabelOpen(false);
  };

  return (
    <TooltipProvider>
      <aside className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
        <div className="p-6">
          <button
            onClick={onCompose}
            className="w-full flex items-center justify-center space-x-2 bg-gray-800 text-white px-4 py-3 rounded-full hover:bg-gray-900 transition-colors font-medium"
          >
            <MailPlus size={20} />
            <span>Write Email</span>
          </button>
        </div>
      
        {/* Profile Selector */}
        <div className="px-6 mb-6">
          <ProfileSelector />
          <button
            onClick={clearProfile}
            className="w-full mt-2 flex items-center justify-center px-3 py-2 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut size={14} className="mr-2" />
            <span>Switch Profile</span>
          </button>
        </div>
            
        <nav className="flex-1 overflow-y-auto px-4">
          <div className="space-y-2">
            {/* Dashboard - Only for David */}
            {currentProfile?.name === 'David' && (
              <Link
                to="/dashboard"
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                  location.pathname === '/dashboard'
                    ? 'text-gray-800 bg-white shadow-lg'
                    : 'text-gray-600 hover:bg-white hover:shadow-md'
                }`}
              >
                <span className="mr-3"><BarChart3 size={20} className="text-purple-500" /></span>
                <span>Dashboard</span>
              </Link>
            )}

            {/* Main item with dropdown toggle */}
            <div>
              <div className="flex items-center">
                <Link
                  to={mainItem.path}
                  className={`flex-1 flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                    location.pathname === mainItem.path && !location.search
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3">{mainItem.icon}</span>
                  <span>{mainItem.label}</span>
                </Link>
                <button 
                  onClick={toggleDropdown}
                  className="px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {isDropdownOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {/* Dropdown menu */}
              <div className={`ml-4 mt-2 space-y-1 transition-all duration-300 ease-in-out overflow-hidden ${
                isDropdownOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}>
                {dropdownItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center px-4 py-2.5 text-sm transition-all duration-300 rounded-lg ${
                        location.pathname === item.path
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                  
                  {/* Gmail Labels Section with Inline Expansion */}
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      onClick={() => setIsLabelsOpen(!isLabelsOpen)}
                      className="w-full justify-start px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-white hover:shadow-md rounded-lg h-auto transition-all duration-200"
                    >
                      <span className="mr-3"><Folder size={20} className="text-gray-500" /></span>
                      <span className="flex-1 text-left">Folders</span>
                      {isLabelsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                    
                    {/* Collapsible Content */}
                    <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
                      isLabelsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      <div className="mt-2 pl-4 border-l-2 border-gray-200 ml-4">
                        {/* Search Bar */}
                        <div className="px-2 pb-2">
                          <div className="flex items-center space-x-2">
                            <div className="relative flex-1">
                              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Search"
                                value={labelSearch}
                                onChange={(e) => setLabelSearch(e.target.value)}
                                className="pl-9 h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg"
                              />
                              {labelSearch && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-gray-100 rounded-md"
                                  onClick={() => setLabelSearch('')}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            <Tooltip delayDuration={300}>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 hover:bg-gray-100 rounded-lg"
                                  onClick={handleCreateLabel}
                                >
                                  <Plus className="h-4 w-4 text-gray-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent 
                                side="right" 
                                className="bg-gray-800 text-white border-gray-700"
                              >
                                <p>Create new label</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        
                        {/* Scrollable Labels List */}
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                          {loadingLabels ? (
                            <div className="flex items-center px-3 py-1.5 text-xs text-gray-500">
                              <Loader2 size={12} className="mr-2 animate-spin" />
                              Loading folders...
                            </div>
                          ) : filteredLabels.length > 0 ? (
                            filteredLabels.map((label) => (
                              <Tooltip key={label.id} delayDuration={300}>
                                <TooltipTrigger asChild>
                                  <Link
                                    to={`/inbox?q=${encodeURIComponent(`label:${label.name}`)}`}
                                    className={`flex items-center w-full px-3 py-1.5 text-xs transition-colors rounded-lg group ${
                                      location.search.includes(`q=${encodeURIComponent(`label:${label.name}`)}`)
                                        ? 'bg-blue-50 text-blue-600 border border-blue-200'
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    <Tag 
                                      size={12} 
                                      className={`mr-2 ${
                                        location.search.includes(`q=${encodeURIComponent(`label:${label.name}`)}`)
                                          ? 'text-blue-500'
                                          : 'text-gray-400 group-hover:text-gray-600'
                                      }`} 
                                    />
                                    <span className="truncate flex-1">{label.displayName}</span>
                                    {(label.messagesTotal ?? 0) > 0 && (
                                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                        location.search.includes(`q=${encodeURIComponent(`label:${label.name}`)}`)
                                          ? 'bg-blue-100 text-blue-600'
                                          : 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {label.messagesTotal}
                                      </span>
                                    )}
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent 
                                  side="right" 
                                  className="bg-gray-800 text-white border-gray-700"
                                >
                                  <p>{label.displayName}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))
                          ) : labelSearch ? (
                            <div className="px-3 py-1.5 text-xs text-gray-500 text-center">
                              No folders found for "{labelSearch}"
                            </div>
                          ) : (
                            <div className="px-3 py-1.5 text-xs text-gray-500 text-center">
                              No folders found
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>
            
            {/* Other main navigation items */}
            <Link
              to="/orders"
              className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                location.pathname === '/orders'
                  ? 'text-gray-800 bg-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="mr-3"><Clipboard size={20} className="text-orange-500"/></span>
              <span>Orders</span>
            </Link>
            
            <Link
              to="/shipments"
              className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                location.pathname === '/shipments'
                  ? 'text-gray-800 bg-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="mr-3"><Package size={20} className="text-red-500" /></span>
              <span>Shipments</span>
            </Link>
            
            <Link
              to="/calendar"
              className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                location.pathname === '/calendar'
                  ? 'text-gray-800 bg-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="mr-3"><Calendar size={20} className="text-purple-500" /></span>
              <span>Calendar</span>
            </Link>
            
            <Link
              to="/invoice-generator"
              className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                location.pathname === '/invoice-generator'
                  ? 'text-gray-800 bg-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="mr-3"><FileText size={20} className="text-green-500"/></span>
              <span>Invoices</span>
            </Link>
            
            <Link
              to="/settings"
              className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl ${
                location.pathname === '/settings'
                  ? 'text-gray-800 bg-white shadow-lg'
                  : 'text-gray-600 hover:bg-white hover:shadow-md'
              }`}
            >
              <span className="mr-3"><Settings size={20} /></span>
              <span>Settings</span>
            </Link>
          </div>
        </nav>
        
        {/* Out of Office Toggle - For David and Marti */}
        {(currentProfile?.name === 'David' || currentProfile?.name === 'Marti') && (
          <div className="p-4">
            <div className="p-2 bg-white rounded-md border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Status</span>
                <Toggle
                  checked={isOutOfOffice}
                  onCheckedChange={setOutOfOffice}
                  variant="warning"
                  className="scale-75"
                />
              </div>
              <div className="text-xs text-gray-500">
                {isOutOfOffice ? (
                  <div className="flex items-center text-blue-600">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse"></div>
                    Out of Office
                  </div>
                ) : (
                  <div className="flex items-center text-green-600">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></div>
                    Active
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Create Label Modal */}
        {isCreateLabelOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-80 shadow-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Create New Label</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="labelName" className="block text-sm font-medium text-gray-700 mb-2">
                    Label Name
                  </label>
                  <Input
                    id="labelName"
                    placeholder="Enter label name..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full"
                    autoFocus
                    disabled={isAddingLabel}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isAddingLabel) {
                        handleLabelCreate();
                      } else if (e.key === 'Escape' && !isAddingLabel) {
                        handleCancelCreate();
                      }
                    }}
                  />
                  {addLabelError && (
                    <p className="text-red-600 text-sm mt-1">{addLabelError}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelCreate}
                    disabled={isAddingLabel}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleLabelCreate}
                    disabled={!newLabelName.trim() || isAddingLabel}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isAddingLabel ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;