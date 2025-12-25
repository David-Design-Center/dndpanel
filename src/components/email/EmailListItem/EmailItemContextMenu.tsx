import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tag, Filter, ChevronRight, Search, Settings, Plus, FolderInput } from 'lucide-react';
import { useLabel } from '@/contexts/LabelContext';
import { useNavigate } from 'react-router-dom';
import { filterAndPrepareLabels, hasExactLabelMatch } from '../utils/labelFiltering';

interface EmailItemContextMenuProps {
  position: { x: number; y: number; show: boolean };
  onClose: () => void;
  onApplyLabel: (labelId: string) => Promise<void>;
  onCreateFilter: () => void;
  onOpenCreateLabel: (initialName: string) => void;
}

export function EmailItemContextMenu({
  position,
  onClose,
  onApplyLabel,
  onCreateFilter,
  onOpenCreateLabel
}: EmailItemContextMenuProps) {
  const navigate = useNavigate();
  const { labels } = useLabel();
  const [showLabelSubmenu, setShowLabelSubmenu] = useState(false);
  const [showFilterSubmenu, setShowFilterSubmenu] = useState(false);
  const [labelSearchQuery, setLabelSearchQuery] = useState('');
  const [isApplyingLabel, setIsApplyingLabel] = useState<string | null>(null);
  
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const labelSearchRef = useRef<HTMLInputElement>(null);
  const hideLabelTimerRef = useRef<number | null>(null);

  // Filter labels
  const filteredLabels = filterAndPrepareLabels(labels, labelSearchQuery);
  const hasExactMatch = hasExactLabelMatch(filteredLabels, labelSearchQuery);

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        onClose();
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery('');
      }
    };

    const handleScroll = (event: Event) => {
      const target = event.target as Node | null;
      if (contextMenuRef.current && target && contextMenuRef.current.contains(target)) {
        return; // Ignore internal scrolls
      }
      if (position.show) {
        onClose();
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery('');
      }
    };

    const handleResize = () => {
      if (position.show) {
        onClose();
        setShowLabelSubmenu(false);
        setShowFilterSubmenu(false);
        setLabelSearchQuery('');
      }
    };

    if (position.show) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [position.show, onClose]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideLabelTimerRef.current) {
        clearTimeout(hideLabelTimerRef.current);
      }
    };
  }, []);

  const handleShowLabelSubmenu = () => {
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
    requestAnimationFrame(() => {
      labelSearchRef.current?.focus();
    });
  };

  const handleHideLabelSubmenu = () => {
    if (hideLabelTimerRef.current) return;
    hideLabelTimerRef.current = window.setTimeout(() => {
      setShowLabelSubmenu(false);
      setLabelSearchQuery('');
      hideLabelTimerRef.current = null;
    }, 200);
  };

  const cancelHideLabelSubmenu = () => {
    if (hideLabelTimerRef.current) {
      clearTimeout(hideLabelTimerRef.current);
      hideLabelTimerRef.current = null;
    }
    setShowLabelSubmenu(true);
  };

  const handleApplyLabelClick = async (labelId: string) => {
    setIsApplyingLabel(labelId);
    try {
      await onApplyLabel(labelId);
      onClose();
      setShowLabelSubmenu(false);
      setLabelSearchQuery('');
    } catch (error) {
      // Error already handled in parent
    } finally {
      setIsApplyingLabel(null);
    }
  };

  const handleManageFilters = () => {
    onClose();
    setShowFilterSubmenu(false);
    navigate('/settings?tab=filters');
  };

  const handleCreateNewFilter = () => {
    onClose();
    setShowFilterSubmenu(false);
    onCreateFilter();
  };

  if (!position.show) return null;

  return createPortal(
    <div
      ref={contextMenuRef}
      className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl py-2 min-w-48"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(0, 0)',
      }}
    >
      {/* Add to Folder */}
      <div className="relative">
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
          onMouseEnter={handleShowLabelSubmenu}
          onMouseLeave={handleHideLabelSubmenu}
        >
          <div className="flex items-center">
            <FolderInput size={16} className="mr-3 text-gray-500" />
            Move
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </button>
        
        {/* Label Submenu */}
        {showLabelSubmenu && (
          <div
            className="absolute left-full -top-2 ml-0 bg-white border border-gray-200 rounded-lg shadow-lg w-80 h-80 flex flex-col overflow-hidden"
            onMouseEnter={cancelHideLabelSubmenu}
            onMouseLeave={handleHideLabelSubmenu}
          >
            {/* Hover bridge */}
            <div
              className="absolute top-0 right-full w-2 h-full"
              onMouseEnter={cancelHideLabelSubmenu}
            />
            
            {/* Search Bar */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  ref={labelSearchRef}
                  type="text"
                  placeholder="Search folders..."
                  value={labelSearchQuery}
                  onChange={(e) => setLabelSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
            
            {/* Scrollable Labels List */}
            <div className="flex-1 overflow-y-auto overscroll-contain pr-1" onWheelCapture={(e) => e.stopPropagation()}>
              {filteredLabels.length > 0 ? (
                filteredLabels.map(label => (
                  <button
                    key={label.id}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                    onClick={() => handleApplyLabelClick(label.id)}
                    disabled={isApplyingLabel === label.id}
                  >
                    <div className="w-2 h-2 rounded-full mr-2 bg-blue-500 flex-shrink-0"></div>
                    <span className="truncate">
                      {isApplyingLabel === label.id ? 'Applying...' : label.displayName}
                    </span>
                  </button>
                ))
              ) : labelSearchQuery ? (
                <div className="px-3 py-2 text-xs text-gray-500">
                  No folders found for "{labelSearchQuery}"
                </div>
              ) : (
                <div className="px-3 py-2 text-xs text-gray-500">No folders available</div>
              )}
              
              {/* Create new label CTA */}
              {labelSearchQuery.trim() && !hasExactMatch && (
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-2 mt-2">
                  <button
                    className="w-full text-left text-xs text-blue-600 hover:text-blue-700 font-medium px-1 py-1 rounded hover:bg-blue-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateLabel(labelSearchQuery.trim());
                      onClose();
                    }}
                  >
                    Create folder "{labelSearchQuery.trim()}"
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Menu */}
      <div className="relative">
        <button
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
          onMouseEnter={() => setShowFilterSubmenu(true)}
          onMouseLeave={() => setShowFilterSubmenu(false)}
        >
          <div className="flex items-center">
            <Filter size={16} className="mr-3 text-gray-500" />
            Rules
          </div>
          <ChevronRight size={14} className="text-gray-400" />
        </button>
        
        {/* Filter Submenu */}
        {showFilterSubmenu && (
          <div
            className="absolute left-full -top-2 ml-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-56 max-h-80 overflow-hidden"
            onMouseEnter={() => setShowFilterSubmenu(true)}
            onMouseLeave={() => setShowFilterSubmenu(false)}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              onClick={handleManageFilters}
            >
              <Settings size={16} className="mr-3 text-gray-500" />
              Manage Rules
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
              onClick={handleCreateNewFilter}
            >
              <Plus size={16} className="mr-3 text-gray-500" />
              Create Rules
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
