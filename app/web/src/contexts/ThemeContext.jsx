import React, { createContext, useContext } from "react";
import useTheme from "../hooks/useTheme.js";

// Create the theme context
const ThemeContext = createContext(undefined);

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const themeValue = useTheme();

  return <ThemeContext.Provider value={themeValue}>{children}</ThemeContext.Provider>;
};

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }

  return context;
};
