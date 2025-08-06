import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThemeProvider, useThemeContext } from "../../src/contexts/ThemeContext.jsx";

// Test component that uses the theme context
const TestComponent = () => {
  const { theme, setTheme, isDark } = useThemeContext();

  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="isDark">{isDark.toString()}</span>
      <button
        data-testid="toggle-theme"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      >
        Toggle Theme
      </button>
    </div>
  );
};

// Test component that tries to use context outside provider
const ComponentOutsideProvider = () => {
  const themeContext = useThemeContext();
  return <div>{themeContext.theme}</div>;
};

describe("ThemeContext", () => {
  let mockLocalStorage;
  let mockMatchMedia;

  beforeEach(() => {
    // Reset DOM classes
    document.documentElement.classList.remove("dark");

    // Mock localStorage
    mockLocalStorage = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    Object.defineProperty(window, "localStorage", {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock matchMedia
    mockMatchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("ThemeProvider", () => {
    it("should provide theme context to child components", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("theme")).toHaveTextContent("light");
      expect(screen.getByTestId("isDark")).toHaveTextContent("false");
    });

    it("should provide theme toggle functionality", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Act
      act(() => {
        screen.getByTestId("toggle-theme").click();
      });

      // Assert
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("isDark")).toHaveTextContent("true");
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
    });

    it("should initialize with system theme when localStorage is empty", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      // Act
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("theme")).toHaveTextContent("system");
      expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    });

    it("should handle multiple child components", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");

      const MultipleChildren = () => (
        <ThemeProvider>
          <TestComponent />
          <div data-testid="second-child">
            <TestComponent />
          </div>
        </ThemeProvider>
      );

      // Act
      render(<MultipleChildren />);

      // Assert
      const themeElements = screen.getAllByTestId("theme");
      const isDarkElements = screen.getAllByTestId("isDark");

      expect(themeElements).toHaveLength(2);
      expect(isDarkElements).toHaveLength(2);

      themeElements.forEach((element) => {
        expect(element).toHaveTextContent("dark");
      });

      isDarkElements.forEach((element) => {
        expect(element).toHaveTextContent("true");
      });
    });

    it("should update all consuming components when theme changes", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      const MultipleConsumers = () => (
        <ThemeProvider>
          <TestComponent />
          <div data-testid="second-consumer">
            <TestComponent />
          </div>
        </ThemeProvider>
      );

      render(<MultipleConsumers />);

      // Act
      act(() => {
        screen.getAllByTestId("toggle-theme")[0].click();
      });

      // Assert
      const themeElements = screen.getAllByTestId("theme");
      const isDarkElements = screen.getAllByTestId("isDark");

      themeElements.forEach((element) => {
        expect(element).toHaveTextContent("dark");
      });

      isDarkElements.forEach((element) => {
        expect(element).toHaveTextContent("true");
      });
    });
  });

  describe("useThemeContext", () => {
    it("should return theme context values when used within provider", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("theme")).toBeInTheDocument();
      expect(screen.getByTestId("isDark")).toBeInTheDocument();
      expect(screen.getByTestId("toggle-theme")).toBeInTheDocument();
    });

    it("should throw error when used outside of ThemeProvider", () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act & Assert
      expect(() => {
        render(<ComponentOutsideProvider />);
      }).toThrow("useThemeContext must be used within a ThemeProvider");

      consoleSpy.mockRestore();
    });

    it("should provide correct interface with theme, setTheme, and isDark", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      mockMatchMedia.mockReturnValue({
        matches: false, // System prefers light
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const InterfaceTestComponent = () => {
        const context = useThemeContext();

        return (
          <div>
            <span data-testid="has-theme">{typeof context.theme}</span>
            <span data-testid="has-setTheme">{typeof context.setTheme}</span>
            <span data-testid="has-isDark">{typeof context.isDark}</span>
          </div>
        );
      };

      // Act
      render(
        <ThemeProvider>
          <InterfaceTestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("has-theme")).toHaveTextContent("string");
      expect(screen.getByTestId("has-setTheme")).toHaveTextContent("function");
      expect(screen.getByTestId("has-isDark")).toHaveTextContent("boolean");
    });
  });

  describe("Context Integration", () => {
    it("should maintain theme state across component re-renders", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      const { rerender } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Act - Change theme
      act(() => {
        screen.getByTestId("toggle-theme").click();
      });

      // Re-render the provider
      rerender(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert - Theme should persist
      expect(screen.getByTestId("theme")).toHaveTextContent("dark");
      expect(screen.getByTestId("isDark")).toHaveTextContent("true");
    });

    it("should handle nested providers correctly", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      const NestedProviders = () => (
        <ThemeProvider>
          <div data-testid="outer">
            <TestComponent />
            <ThemeProvider>
              <div data-testid="inner">
                <TestComponent />
              </div>
            </ThemeProvider>
          </div>
        </ThemeProvider>
      );

      // Act
      render(<NestedProviders />);

      // Assert - Both should work independently
      const themeElements = screen.getAllByTestId("theme");
      expect(themeElements).toHaveLength(2);

      themeElements.forEach((element) => {
        expect(element).toHaveTextContent("light");
      });
    });

    it("should properly clean up when provider unmounts", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      const mockMediaQuery = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQuery);

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Act
      unmount();

      // Assert - Media query listener should be cleaned up
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage errors gracefully in provider", () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage not available");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("theme")).toHaveTextContent("system");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load theme from localStorage:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle matchMedia errors gracefully in provider", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      mockMatchMedia.mockImplementation(() => {
        throw new Error("matchMedia not supported");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Assert
      expect(screen.getByTestId("theme")).toHaveTextContent("system");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to set up media query listener:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
