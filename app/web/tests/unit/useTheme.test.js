import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import useTheme from "../../src/hooks/useTheme.js";

describe("useTheme Hook", () => {
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

  describe("Initialization", () => {
    it("should initialize with system theme by default when localStorage is empty", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.theme).toBe("system");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    });

    it("should initialize with stored theme from localStorage", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.theme).toBe("dark");
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith("theme");
    });

    it("should handle localStorage errors gracefully and default to system", () => {
      // Arrange
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error("localStorage not available");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.theme).toBe("system");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load theme from localStorage:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Theme State Management", () => {
    it("should set isDark to true when theme is dark", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should set isDark to false when theme is light", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should detect system theme when theme is system", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      mockMatchMedia.mockReturnValue({
        matches: true, // System prefers dark
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });
  });

  describe("Theme Changes", () => {
    it("should update theme and save to localStorage when setTheme is called", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");
      const { result } = renderHook(() => useTheme());

      // Act
      act(() => {
        result.current.setTheme("dark");
      });

      // Assert
      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith("theme", "dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should handle localStorage save errors gracefully", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error("localStorage not available");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { result } = renderHook(() => useTheme());

      // Act
      act(() => {
        result.current.setTheme("dark");
      });

      // Assert
      expect(result.current.theme).toBe("dark");
      expect(result.current.isDark).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save theme to localStorage:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should switch to system theme detection when theme is set to system", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");
      mockMatchMedia.mockReturnValue({
        matches: false, // System prefers light
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });
      const { result } = renderHook(() => useTheme());

      // Act
      act(() => {
        result.current.setTheme("system");
      });

      // Assert
      expect(result.current.theme).toBe("system");
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("System Theme Detection", () => {
    it("should listen for system theme changes when theme is system", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      const mockMediaQuery = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQuery);

      // Act
      renderHook(() => useTheme());

      // Assert
      expect(mockMatchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    });

    it("should update theme when system preference changes and theme is system", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      let changeHandler;
      const mockMediaQuery = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn((event, handler) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQuery);

      const { result } = renderHook(() => useTheme());

      // Act - Simulate system theme change to dark
      act(() => {
        changeHandler({ matches: true });
      });

      // Assert
      expect(result.current.isDark).toBe(true);
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should not update theme when system preference changes but theme is not system", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");
      let changeHandler;
      const mockMediaQuery = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn((event, handler) => {
          changeHandler = handler;
        }),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQuery);

      const { result } = renderHook(() => useTheme());

      // Act - Simulate system theme change to dark
      act(() => {
        changeHandler({ matches: true });
      });

      // Assert
      expect(result.current.theme).toBe("light");
      expect(result.current.isDark).toBe(false);
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });

    it("should handle media query listener errors gracefully", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      mockMatchMedia.mockImplementation(() => {
        throw new Error("matchMedia not supported");
      });
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current.theme).toBe("system");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to set up media query listener:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should clean up media query listener on unmount", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("system");
      const mockMediaQuery = {
        matches: false,
        media: "(prefers-color-scheme: dark)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockMatchMedia.mockReturnValue(mockMediaQuery);

      // Act
      const { unmount } = renderHook(() => useTheme());
      unmount();

      // Assert
      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });
  });

  describe("DOM Manipulation", () => {
    it("should add dark class to document element when isDark is true", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("dark");

      // Act
      renderHook(() => useTheme());

      // Assert
      expect(document.documentElement.classList.contains("dark")).toBe(true);
    });

    it("should remove dark class from document element when isDark is false", () => {
      // Arrange
      document.documentElement.classList.add("dark"); // Start with dark class
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      renderHook(() => useTheme());

      // Assert
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("Hook Return Values", () => {
    it("should return correct interface with theme, setTheme, and isDark", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      const { result } = renderHook(() => useTheme());

      // Assert
      expect(result.current).toHaveProperty("theme");
      expect(result.current).toHaveProperty("setTheme");
      expect(result.current).toHaveProperty("isDark");
      expect(typeof result.current.theme).toBe("string");
      expect(typeof result.current.setTheme).toBe("function");
      expect(typeof result.current.isDark).toBe("boolean");
    });

    it("should maintain stable setTheme function reference", () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue("light");

      // Act
      const { result, rerender } = renderHook(() => useTheme());
      const initialSetTheme = result.current.setTheme;

      rerender();

      // Assert
      expect(result.current.setTheme).toBe(initialSetTheme);
    });
  });
});
