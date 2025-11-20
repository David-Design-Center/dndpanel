# Quick Migration Guide - New Architecture

## For Developers Working on This Codebase

### What Changed?

The layout and context architecture has been refactored for better maintainability. Here's what you need to know:

## 1. Using Layout State

### ❌ Old Way (Still works but deprecated)
```tsx
import { useInboxLayout } from '@/contexts/InboxLayoutContext';
import { usePanelSizes } from '@/contexts/PanelSizesContext';
import { useFoldersColumn } from '@/contexts/FoldersColumnContext';

function MyComponent() {
  const { selectedEmailId } = useInboxLayout();
  const { panelSizes } = usePanelSizes();
  const { isFoldersColumnExpanded } = useFoldersColumn();
}
```

### ✅ New Way (Recommended)
```tsx
import { useLayoutState } from '@/contexts/LayoutStateContext';

function MyComponent() {
  const { 
    selectedEmailId, 
    panelSizes, 
    isFoldersColumnExpanded 
  } = useLayoutState();
}
```

**All layout state in one place!** No more importing 3 separate contexts.

## 2. Creating New List + Detail Views

Want to create a list/detail view for Orders, Invoices, etc.?

### ✅ Use ResizableLayout
```tsx
import { ResizableLayout } from '@/components/layout/ResizableLayout';

function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  return (
    <ResizableLayout
      leftPanel={
        <OrdersList onSelectOrder={setSelectedOrderId} />
      }
      rightPanel={
        <OrderDetail orderId={selectedOrderId} />
      }
      showRightPanel={!!selectedOrderId}
      leftPanelMinWidth={400}
      onResize={(sizes) => {
        // Optional: save sizes to localStorage
        localStorage.setItem('orderPanelSizes', JSON.stringify(sizes));
      }}
    />
  );
}
```

## 3. Adding New Context Providers

### Core Providers (Global App State)
Add to `src/providers/CoreProviders.tsx`:
```tsx
import { MyNewGlobalProvider } from '../contexts/MyNewGlobalContext';

export function CoreProviders({ children }) {
  return (
    <AuthProvider>
      <SecurityProvider>
        <MyNewGlobalProvider>  {/* Add here */}
          {/* ... existing providers */}
        </MyNewGlobalProvider>
      </SecurityProvider>
    </AuthProvider>
  );
}
```

### Feature Providers (Route-Specific State)
Add to `src/providers/FeatureProviders.tsx`:
```tsx
import { MyNewFeatureProvider } from '../contexts/MyNewFeatureContext';

export function FeatureProviders({ children }) {
  return (
    <EmailPreloaderProvider>
      <MyNewFeatureProvider>  {/* Add here */}
        {/* ... existing providers */}
      </MyNewFeatureProvider>
    </EmailPreloaderProvider>
  );
}
```

## 4. Profile Guard Usage

Need to protect a route that requires profile selection?

### ✅ Use ProfileGuard
```tsx
import { ProfileGuard } from '@/components/profile/ProfileGuard';

function MyProtectedPage() {
  return (
    <ProfileGuard>
      {/* Your page content - only renders when profile is selected */}
      <div>Protected content here</div>
    </ProfileGuard>
  );
}
```

## 5. Layout State Persistence

Layout preferences (collapsed states, panel sizes) are **automatically persisted** to localStorage:

- `sidebarCollapsed`
- `foldersColumnExpanded`
- `emailListCollapsed`
- `emailPanelSizes`

No manual localStorage calls needed!

## 6. Available Layout State Actions

```tsx
const {
  // Email Selection
  selectedEmailId,
  selectEmail,          // selectEmail('email-id-123')
  clearSelection,       // clearSelection()
  
  // Sidebar
  isSidebarCollapsed,
  toggleSidebar,        // toggleSidebar()
  
  // Folders Column
  isFoldersColumnExpanded,
  toggleFoldersColumn,  // toggleFoldersColumn()
  
  // Email List
  isEmailListCollapsed,
  toggleEmailList,      // toggleEmailList()
  
  // Panel Sizes
  panelSizes,           // { folders: 20, emailList: 45, emailView: 35 }
  updatePanelSizes,     // updatePanelSizes({ folders: 25, ... })
  
  // Layout Coordination
  getOptimalLayout,     // Returns optimal percentages
  resetToDefaultLayout, // Reset to default state
  autoCollapseForMobile // Collapse for mobile viewport
} = useLayoutState();
```

## 7. Common Patterns

### Conditional Rendering Based on Selection
```tsx
const { selectedEmailId } = useLayoutState();

return (
  <div>
    {selectedEmailId ? (
      <EmailViewer emailId={selectedEmailId} />
    ) : (
      <EmptyState message="Select an email" />
    )}
  </div>
);
```

### Toggling UI Elements
```tsx
const { isSidebarCollapsed, toggleSidebar } = useLayoutState();

return (
  <button onClick={toggleSidebar}>
    {isSidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
  </button>
);
```

### Saving Custom Panel Sizes
```tsx
const { panelSizes, updatePanelSizes } = useLayoutState();

const handleResize = (newSizes: number[]) => {
  updatePanelSizes({
    folders: panelSizes.folders,
    emailList: newSizes[0],
    emailView: newSizes[1]
  });
};
```

## 8. Debugging Tips

### Check Current Layout State
```tsx
const layoutState = useLayoutState();
console.log('Current layout state:', layoutState);
```

### Clear Persisted State
If layout gets stuck in a bad state:
```javascript
// In browser console
localStorage.removeItem('sidebarCollapsed');
localStorage.removeItem('foldersColumnExpanded');
localStorage.removeItem('emailPanelSizes');
// Then refresh
```

### Reset to Defaults
```tsx
const { resetToDefaultLayout } = useLayoutState();

// In your component
<button onClick={resetToDefaultLayout}>
  Reset Layout
</button>
```

## 9. What NOT to Do

### ❌ Don't Create Separate UI State Contexts
```tsx
// Bad - creates more context complexity
export function MyNewUIStateProvider() {
  const [isExpanded, setIsExpanded] = useState(false);
  // ...
}
```

### ✅ Do - Add to LayoutStateContext or use local state
```tsx
// Option 1: If it's layout-related, add to LayoutStateContext
// Option 2: If it's component-specific, use local useState

function MyComponent() {
  const [isExpanded, setIsExpanded] = useState(false); // Local state is fine!
}
```

### ❌ Don't Wrap Routes with Individual Providers
```tsx
// Bad - creates provider spaghetti
<Route path="/my-page" element={
  <Provider1>
    <Provider2>
      <Provider3>
        <MyPage />
      </Provider3>
    </Provider2>
  </Provider1>
} />
```

### ✅ Do - Add to CoreProviders or FeatureProviders
```tsx
// Good - centralized management
// Add to src/providers/FeatureProviders.tsx
```

## 10. Testing Your Changes

After making changes, verify:

1. **Dev server runs**: `npm run dev`
2. **No TypeScript errors**: Check VS Code problems panel
3. **Navigation works**: Click through all routes
4. **State persists**: Refresh page, check if collapsed states remain
5. **Panel resizing works**: Drag resize handles

## Questions?

Check the full documentation in:
- `README/ARCHITECTURE_REFACTORING_COMPLETE.md` - Complete refactoring summary
- `README/EMAIL_ARCHITECTURE_ANALYSIS.md` - Email system patterns
- Source code comments in `src/contexts/LayoutStateContext.tsx`

## Summary

**Before**: 17 contexts, 11+ provider nesting levels, complex state management

**After**: ~10 contexts, 7 provider levels, unified layout state with localStorage

**Result**: Cleaner, faster, more maintainable codebase! 🎉
