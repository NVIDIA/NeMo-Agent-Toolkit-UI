import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings, saveSettings } from '@/utils/app/settings';

interface ThemeContextType {
  lightMode: 'light' | 'dark';
  setLightMode: (mode: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lightMode, setLightModeState] = useState<'light' | 'dark'>('light');

  // Wrapper function that saves settings when theme changes
  const setLightMode = (mode: 'light' | 'dark') => {
    setLightModeState(mode);
    const currentSettings = getSettings();
    saveSettings({ ...currentSettings, theme: mode });
  };

  useEffect(() => {
    // Initialize theme from settings
    const settings = getSettings();
    if (settings.theme) {
      setLightModeState(settings.theme);
    }

    // Listen for theme changes in localStorage/sessionStorage
    const handleStorageChange = () => {
      const settings = getSettings();
      if (settings.theme) {
        setLightModeState(settings.theme);
      }
    };

    // Listen for storage events to sync theme across tabs
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically for theme changes within the same tab
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ lightMode, setLightMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
