import { useState, useMemo } from 'react';
import { Inbox, Send, Folder, FileWarning, Trash, MailPlus, AlertCircle, ChevronDown, ChevronRight, Clipboard, FileText, Settings, Tag, Loader2, BarChart3, Package, Calendar, Search, X } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import ProfileSelector from './ProfileSelector';
import { useLabel } from '../contexts/LabelContext';
import { useProfile } from '../contexts/ProfileContext';

interface SidebarProps {
  onCompose: () => void;
}

function Sidebar({ onCompose }: SidebarProps) {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const { labels, loadingLabels } = useLabel();
  const { currentProfile } = useProfile();
  
  // Filter and clean labels based on search
  const filteredLabels = useMemo(() => {
    // First clean up names and then filter
    const cleanedLabels = labels
      .map(label => ({
        ...label,
        displayName: label.name
          .replace(/^(INBOX\/|Gmail\/|Categories\/)/i, '') // Remove common prefixes
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

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-4">
        <button
          onClick={onCompose}
          className="btn btn-primary w-full flex items-center justify-center space-x-2"
        >
          <MailPlus size={20} />
          <span>Write Email</span>
        </button>
      </div>
      
      {/* Profile Selector */}
      <div className="px-3 mb-3">
        <ProfileSelector />
      </div>
            
      <nav className="mt-2 flex-1 overflow-y-auto">
        <ul>
          {/* Dashboard - Only for David */}
          {currentProfile?.name === 'David' && (
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard'
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="mr-3"><BarChart3 size={20} className="text-purple-500" /></span>
                <span>Dashboard</span>
              </Link>
            </li>
          )}

          {/* Main item with dropdown toggle */}
          <li>
            <div className="flex items-center">
              <Link
                to={mainItem.path}
                className={`flex-1 flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                  location.pathname === mainItem.path && !location.search
                    ? 'text-primary-600 bg-primary-50'
                    : 'text-gray-700 hover:bg-gray-100'
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
            {isDropdownOpen && (
              <ul className="pl-4 mt-1 space-y-1">
                {dropdownItems.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center px-4 py-2 text-sm transition-colors rounded-md ${
                        location.pathname === item.path
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
                
                {/* Gmail Labels Section with Inline Expansion */}
                <li className="mt-1">
                  <Button
                    variant="ghost"
                    onClick={() => setIsLabelsOpen(!isLabelsOpen)}
                    className="w-full justify-start px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <span className="mr-3"><Folder size={20} className="text-gray-500" /></span>
                    <span className="flex-1 text-left">Folders</span>
                    {isLabelsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </Button>
                  
                  {/* Collapsible Content */}
                  <div className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isLabelsOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}>
                    <div className="mt-2 pl-4 border-l border-gray-200 ml-4">
                      {/* Search Bar */}
                      <div className="px-2 pb-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search folders..."
                            value={labelSearch}
                            onChange={(e) => setLabelSearch(e.target.value)}
                            className="pl-9 h-8 text-sm border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          {labelSearch && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1 h-6 w-6 p-0 hover:bg-gray-100"
                              onClick={() => setLabelSearch('')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
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
                            <Link
                              key={label.id}
                              to={`/inbox?q=${encodeURIComponent(`label:${label.name}`)}`}
                              className={`flex items-center w-full px-3 py-1.5 text-xs transition-colors rounded-md group ${
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
                </li>
              </ul>
            )}
          </li>
          
          <li className="mt-4">
            <Link
              to="/orders"
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/orders'
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3"><Clipboard size={20} className="text-orange-500"/></span>
              <span>Orders</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/shipments"
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/shipments'
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3"><Package size={20} className="text-red-500" /></span>
              <span>Shipments</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/calendar"
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/calendar'
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3"><Calendar size={20} className="text-purple-500" /></span>
              <span>Calendar</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/invoice-generator"
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/invoice-generator'
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3"><FileText size={20} className="text-green-500"/></span>
              <span>Invoices</span>
            </Link>
          </li>
          
          <li>
            <Link
              to="/settings"
              className={`flex items-center px-4 py-2 text-sm font-medium transition-colors ${
                location.pathname === '/settings'
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3"><Settings size={20} /></span>
              <span>Settings</span>
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;