import { render, screen } from "@testing-library/svelte";
import { describe, it, expect, beforeEach, vi } from "vitest";
import Layout from "../../src/routes/+layout.svelte";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock matchMedia
const matchMediaMock = vi.fn();

describe("Layout Component", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup localStorage mock
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Setup matchMedia mock
    Object.defineProperty(window, "matchMedia", {
      value: matchMediaMock,
      writable: true,
    });

    // Reset document classes
    document.documentElement.className = "";
  });

  it("should render main content area with proper structure", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    const { container } = render(Layout);

    // Assert
    const main = container.querySelector("main");
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute("id", "main-content");
  });

  it("should render skip link for accessibility", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    render(Layout);

    // Assert
    const skipLink = screen.getByText("Skip to main content");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(skipLink).toHaveClass("skip-link");
  });

  it("should apply dark mode when saved theme is dark", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue("dark");

    // Act
    render(Layout);

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should apply dark mode when system preference is dark and no saved theme", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    render(Layout);

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should not apply dark mode when saved theme is light", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: true, // System prefers dark
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue("light");

    // Act
    render(Layout);

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should set up media query listener for system theme changes", () => {
    // Arrange
    const addEventListenerSpy = vi.fn();
    const removeEventListenerSpy = vi.fn();

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    render(Layout);

    // Assert
    expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("should handle media query change to dark mode when no saved theme", () => {
    // Arrange
    let changeHandler;
    const addEventListenerSpy = vi.fn((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerSpy,
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    render(Layout);

    // Simulate media query change to dark
    changeHandler({ matches: true });

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("should handle media query change to light mode when no saved theme", () => {
    // Arrange
    let changeHandler;
    const addEventListenerSpy = vi.fn((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });

    matchMediaMock.mockReturnValue({
      matches: true, // Start with dark
      addEventListener: addEventListenerSpy,
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    render(Layout);

    // Simulate media query change to light
    changeHandler({ matches: false });

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should not change theme on media query change when theme is saved", () => {
    // Arrange
    let changeHandler;
    const addEventListenerSpy = vi.fn((event, handler) => {
      if (event === "change") {
        changeHandler = handler;
      }
    });

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: addEventListenerSpy,
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue("light"); // Saved theme

    // Act
    render(Layout);

    // Simulate media query change to dark (should be ignored)
    changeHandler({ matches: true });

    // Assert
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("should have proper container styling", () => {
    // Arrange
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    localStorageMock.getItem.mockReturnValue(null);

    // Act
    const { container } = render(Layout);

    // Assert
    const layoutDiv = container.querySelector(".min-h-screen");
    expect(layoutDiv).toBeInTheDocument();
    expect(layoutDiv).toHaveClass("transition-colors", "duration-200");
  });
});
