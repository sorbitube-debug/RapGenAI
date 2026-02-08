
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeType = 'dark' | 'light' | 'neon' | 'classic';

interface ThemeContextType {
  theme: ThemeType;
  previewTheme: ThemeType | null;
  setTheme: (t: ThemeType) => void;
  setPreviewTheme: (t: ThemeType | null) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setActiveTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('rapgen_theme') as ThemeType) || 'dark';
  });
  const [previewTheme, setPreviewTheme] = useState<ThemeType | null>(null);

  const setTheme = (t: ThemeType) => {
    setActiveTheme(t);
    localStorage.setItem('rapgen_theme', t);
  };

  const currentTheme = previewTheme || theme;

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', currentTheme);
    
    // Apply theme-specific body classes if needed
    if (currentTheme === 'light') {
      document.body.style.backgroundColor = '#f4f4f5';
      document.body.style.color = '#18181b';
    } else if (currentTheme === 'neon') {
      document.body.style.backgroundColor = '#05000a';
      document.body.style.color = '#e0e0e0';
    } else if (currentTheme === 'classic') {
      document.body.style.backgroundColor = '#1a1815';
      document.body.style.color = '#d4d4d8';
    } else {
      document.body.style.backgroundColor = '#050505';
      document.body.style.color = '#e0e0e0';
    }
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ theme, previewTheme, setTheme, setPreviewTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
