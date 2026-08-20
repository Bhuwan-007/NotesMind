"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeName, themes } from "../themes/khadi-indigo";

interface ThemeContextType {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeName, setThemeNameState] = useState<ThemeName>("khadi-indigo");

  useEffect(() => {
    // Load theme from localStorage if available
    const savedTheme = localStorage.getItem("themeName") as ThemeName;
    if (savedTheme && themes[savedTheme]) {
      setThemeNameState(savedTheme);
    }
  }, []);

  const setThemeName = (name: ThemeName) => {
    if (themes[name]) {
      setThemeNameState(name);
      localStorage.setItem("themeName", name);
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    const themeVariables = themes[themeName];
    
    // Apply CSS variables to :root
    Object.entries(themeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [themeName]);

  return (
    <ThemeContext.Provider value={{ themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
