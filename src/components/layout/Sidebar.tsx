import { Inbox, MailPlus, ChevronRight, Clipboard, FileText, Settings, BarChart3, Package, Calendar, Users } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useProfile } from '../../contexts/ProfileContext';
import { useAuth } from '../../contexts/AuthContext';
import { useOutOfOffice } from '../../contexts/OutOfOfficeContext';
import { useInboxLayout } from '../../contexts/InboxLayoutContext';
import { useEmailPreloader } from '../../contexts/EmailPreloaderContext';
import { Toggle } from '../ui/liquid-toggle';
import ProfileSelector from '../profile/ProfileSelector';

interface SidebarProps {
  onCompose: () => void;
}

function Sidebar({ onCompose }: SidebarProps) {
  const location = useLocation();
  const { currentProfile } = useProfile();
  const { isAdmin } = useAuth();
  const { isOutOfOffice, setOutOfOffice } = useOutOfOffice();
  const { isSidebarCollapsed, toggleSidebar } = useInboxLayout();
  const { isPreloading } = useEmailPreloader();
  
  // Main item
  const mainItem = { 
    icon: <Inbox size={20} className="text-blue-500" />, 
    label: 'Inbox', 
    path: '/inbox' 
  };

  return (
    <TooltipProvider>
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-48'} bg-gray-50 border-r border-gray-200 flex flex-col h-full transition-all duration-300`}>
        {/* Collapse/Expand Toggle */}
        <div className="flex items-center justify-between border-b border-gray-200" style={{ padding: '0.680rem' }}>
          <div className="flex items-center flex-1 justify-center">
            <button
              onClick={toggleSidebar}
              className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ChevronRight 
                size={16} 
                className={`transition-transform duration-300 ${isSidebarCollapsed ? 'rotate-0' : 'rotate-180'}`} 
              />
            </button>
          </div>
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
      
        {/* Profile Selector - Show for all users */}
        {!isSidebarCollapsed && (
          <div className="px-6 mb-6">
            <ProfileSelector />
            {/* Preloading Indicator */}
            {isPreloading && (
              <div className="mt-3 flex items-center space-x-2 text-xs text-gray-500">
                <div className="animate-spin rounded-full h-3 w-3 border-t border-b border-gray-400"></div>
                <span>Syncing emails...</span>
              </div>
            )}
          </div>
        )}
            
        <nav className="flex-1 overflow-y-auto px-4">
          <div className="space-y-0">
            {/* Dashboard - Only for Admins */}
            {isAdmin && (
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

            {/* Inbox item */}
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
              <Link
                to={mainItem.path}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                  location.pathname === mainItem.path && !location.search
                    ? 'text-gray-800 bg-white shadow-lg'
                    : 'text-gray-600 hover:bg-white hover:shadow-md'
                }`}
              >
                <span className="mr-3 flex-shrink-0">{mainItem.icon}</span>
                <span className="truncate">{mainItem.label}</span>
              </Link>
            )}
            
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
                      to="/contacts"
                      className={`flex items-center justify-center p-2 text-sm font-medium transition-all duration-200 rounded-xl ${
                        location.pathname === '/contacts'
                          ? 'text-gray-800 bg-white shadow-lg'
                          : 'text-gray-600 hover:bg-white hover:shadow-md'
                      }`}
                    >
                      <Users size={16} className="text-teal-500" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-gray-800 text-white border-gray-700">
                    <p>Contacts</p>
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
                  to="/contacts"
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-all duration-200 rounded-xl min-w-0 overflow-hidden ${
                    location.pathname === '/contacts'
                      ? 'text-gray-800 bg-white shadow-lg'
                      : 'text-gray-600 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <span className="mr-3 flex-shrink-0"><Users size={20} className="text-teal-500" /></span>
                  <span className="truncate">Contacts</span>
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
        
        {/* Out of Office Toggle - For all users */}
        {(currentProfile?.name === 'David' || currentProfile?.name === 'Marti' || currentProfile?.name === 'Natalia' || currentProfile?.name === 'Dimitry') && (
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