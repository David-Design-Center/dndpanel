import { createContext, useContext, useState, ReactNode } from 'react';

interface PanelSizesContextType {
  panelSizes: {
    folders: number;
    emailList: number;
    emailView: number;
  };
  updatePanelSizes: (sizes: { folders: number; emailList: number; emailView: number }) => void;
}

const PanelSizesContext = createContext<PanelSizesContextType | undefined>(undefined);

export function PanelSizesProvider({ children }: { children: ReactNode }) {
  const [panelSizes, setPanelSizes] = useState(() => {
    // Load saved sizes from localStorage
    const saved = localStorage.getItem('emailPanelSizes');
    return saved ? JSON.parse(saved) : {
      folders: 20,
      emailList: 45,
      emailView: 35
    };
  });

  const updatePanelSizes = (sizes: { folders: number; emailList: number; emailView: number }) => {
    setPanelSizes(sizes);
    localStorage.setItem('emailPanelSizes', JSON.stringify(sizes));
  };

  return (
    <PanelSizesContext.Provider
      value={{
        panelSizes,
        updatePanelSizes,
      }}
    >
      {children}
    </PanelSizesContext.Provider>
  );
}

export function usePanelSizes() {
  const context = useContext(PanelSizesContext);
  if (context === undefined) {
    throw new Error('usePanelSizes must be used within a PanelSizesProvider');
  }
  return context;
}
