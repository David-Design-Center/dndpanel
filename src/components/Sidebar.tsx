import { useState } from 'react';
import { Inbox, Send, FileWarning, Trash, MailPlus, ChevronDown, ChevronRight, Clipboard, FileText, Settings, BarChart3, Package, Calendar } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ProfileSelector from './ProfileSelector';
import { useProfile } from '../contexts/ProfileContext';
import { useOutOfOffice } from '../contexts/OutOfOfficeContext';
import { useInboxLayout } from '../contexts/InboxLayoutContext';
import { Toggle } from './ui/liquid-toggle';

interface SidebarProps {
  onCompose: () => void;
}

function Sidebar({ onCompose }: SidebarProps) {
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(true);
  const { currentProfile } = useProfile();
  const { isOutOfOffice, setOutOfOffice } = useOutOfOffice();
  const { isSidebarCollapsed, toggleSidebar } = useInboxLayout();
  
  // Main item
  const mainItem = { 
    icon: <Inbox size={20} className="text-blue-500" />, 
    label: 'Inbox', 
    path: '/inbox' 
  };
  
  // Dropdown items - conditionally include Trash for specific profile
  const dropdownItems = [
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
    <TooltipProvider>
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-48'} bg-gray-50 border-r border-gray-200 flex flex-col h-full transition-all duration-300`}>
        {/* Collapse/Expand Toggle */}
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-1 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronRight 
              size={16} 
              className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} 
            />
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="p-6">
            <button
              onClick={onCompose}
              className="w-full flex items-center justify-center space-x-2 bg-gray-800 text-white px-4 py-3 rounded-full hover:bg-gray-900 transition-colors font-medium"
            >
              <MailPlus size={20} />
              <span>Write Email</span>
            </button>
          </div>
        )}

        {isSidebarCollapsed && (
          <div className="p-4">
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  onClick={onCompose}
                  className="w-full flex items-center justify-center bg-gray-800 text-white p-2 rounded-full hover:bg-gray-900 transition-colors"
                >
                  <MailPlus size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                <p>Write Email</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      
        {/* Profile Selector */}
        {!isSidebarCollapsed && (
          <div className="px-6 mb-6">
            <ProfileSelector />
          </div>
        )}
            
        <nav className="flex-1 overflow-y-auto px-4">
          <div className="space-y-2">
            {/* Dashboard - Only for David */}
            {currentProfile?.name === 'David' && (
              isSidebarCollapsed ? (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/dashboard"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/dashboard'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <BarChart3 size={16} className="text-purple-500" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Dashboard</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Link
                  to="/dashboard"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/dashboard'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><BarChart3 size={20} className="text-purple-500" /></span>
                  <span className="truncate">Dashboard</span>
                </Link>
              )
            )}

            {/* Main item with dropdown toggle */}
            <div>
              {isSidebarCollapsed ? (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to={mainItem.path}
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === mainItem.path && !location.search
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Inbox size={16} className="text-blue-500" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Inbox</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <div className="flex items-center">
                    <Link
                      to={mainItem.path}
                      className={`flex-1 flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                        location.pathname === mainItem.path && !location.search
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <span className="mr-3 flex-shrink-0">{mainItem.icon}</span>
                      <span className="truncate">{mainItem.label}</span>
                    </Link>
                    <button 
                      onClick={toggleDropdown}
                      className="px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none flex-shrink-0"
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
                        className={`flex items-center px-4 py-2.5 text-sm transition-all duration-300 rounded-lg min-w-0 overflow-hidden ${
                          location.pathname === item.path
                            ? 'text-gray-800 bg-white shadow-lg'
                            : 'text-gray-600 hover:bg-white hover:shadow-md'
                        }`}
                      >
                        <span className="mr-3 flex-shrink-0">{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Other main navigation items */}
            {isSidebarCollapsed ? (
              /* Collapsed versions with tooltips */
              <>
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/orders"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/orders'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Clipboard size={16} className="text-orange-500"/>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Orders</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/invoices"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/invoices'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <FileText size={16} className="text-green-500"/>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Invoices</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/calendar"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/calendar'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Calendar size={16} className="text-purple-500" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Calendar</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/shipments"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/shipments'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Package size={16} className="text-red-500" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Shipments</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      to="/settings"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/settings'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Settings size={16} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Settings</p>
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              /* Expanded versions */
              <>
                <Link
                  to="/orders"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/orders'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><Clipboard size={20} className="text-orange-500"/></span>
                  <span className="truncate">Orders</span>
                </Link>
                
                <Link
                  to="/invoices"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/invoices'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><FileText size={20} className="text-green-500"/></span>
                  <span className="truncate">Invoices</span>
                </Link>
                
                <Link
                  to="/calendar"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/calendar'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><Calendar size={20} className="text-purple-500" /></span>
                  <span className="truncate">Calendar</span>
                </Link>
                
                <Link
                  to="/shipments"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/shipments'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><Package size={20} className="text-red-500" /></span>
                  <span className="truncate">Shipments</span>
                </Link>
                
                <Link
                  to="/settings"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/settings'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><Settings size={20} /></span>
                  <span className="truncate">Settings</span>
                </Link>
              </>
            )}
          </div>
        </nav>
        
        {/* Out of Office Toggle - For David and Marti */}
        {(currentProfile?.name === 'David' || currentProfile?.name === 'Marti') && (
          isSidebarCollapsed ? (
            <div className="p-4">
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <div 
                      className={`w-3 h-3 rounded-full transition-colors cursor-pointer ${
                        isOutOfOffice 
                          ? 'bg-blue-500 animate-pulse' 
                          : 'bg-green-500'
                      }`}
                      onClick={() => setOutOfOffice(!isOutOfOffice)}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                  <p>{isOutOfOffice ? 'Out of Office' : 'In Office'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
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
                      In Office
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </aside>
    </TooltipProvider>
  );
}

export default Sidebar;