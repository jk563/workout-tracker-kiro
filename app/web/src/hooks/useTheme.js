import { useState, useEffect, useCallback } from "react";

const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "system";
    } catch (error) {
      console.warn("Failed to load theme from localStorage:", error);
      return "system";
    }
  });

  const [isDark, setIsDark] = useState(false);

  const updateDocumentTheme = (isDarkMode) => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    setIsDark(isDarkMode);
  };

  const detectSystemTheme = () => {
    try {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch (error) {
      console.warn("Failed to detect system theme:", error);
      return false;
    }
  };

  const saveTheme = (newTheme) => {
    try {
      localStorage.setItem("theme", newTheme);
    } catch (error) {
      console.warn("Failed to save theme to localStorage:", error);
    }
  };

  const handleThemeChange = useCallback((newTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);

    if (newTheme === "system") {
      updateDocumentTheme(detectSystemTheme());
    } else {
      updateDocumentTheme(newTheme === "dark");
    }
  }, []);

  useEffect(() => {
    // Initialize theme on mount
    if (theme === "system") {
      updateDocumentTheme(detectSystemTheme());
    } else {
      updateDocumentTheme(theme === "dark");
    }

    // Listen for system theme changes
    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        if (theme === "system") {
          updateDocumentTheme(e.matches);
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } catch (error) {
      console.warn("Failed to set up media query listener:", error);
    }
  }, [theme]);

  return {
    theme,
    setTheme: handleThemeChange,
    isDark,
  };
};

export default useTheme;
