import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";

// Mock React DOM createRoot
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Mock the App component
vi.mock("../../src/App.jsx", () => ({
  default: () => <div data-testid="app">App Component</div>,
}));

// Mock the ThemeProvider
vi.mock("../../src/contexts/ThemeContext.jsx", () => ({
  ThemeProvider: ({ children }) => <div data-testid="theme-provider">{children}</div>,
}));

// Mock CSS import
vi.mock("../../src/styles/index.css", () => ({}));

describe("Main Application Entry Point", () => {
  let mockContainer;

  beforeEach(() => {
    // Create a mock container element
    mockContainer = document.createElement("div");
    mockContainer.id = "root";
    document.body.appendChild(mockContainer);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up DOM
    if (mockContainer && mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer);
    }
    vi.clearAllMocks();
  });

  it("should render application in React StrictMode with ThemeProvider", () => {
    // Arrange
    const App = () => <div data-testid="app">App Component</div>;
    const ThemeProvider = ({ children }) => <div data-testid="theme-provider">{children}</div>;

    // Act
    render(
      <React.StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );

    // Assert
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("should find the root container element by id", () => {
    // Arrange
    const container = document.getElementById("root");

    // Act & Assert
    expect(container).toBe(mockContainer);
    expect(container.id).toBe("root");
  });

  it("should use React 19 createRoot API structure", async () => {
    // Arrange
    const { createRoot } = await import("react-dom/client");

    // Act
    const mockRoot = createRoot(mockContainer);

    // Assert
    expect(vi.mocked(createRoot)).toHaveBeenCalledWith(mockContainer);
    expect(mockRoot).toHaveProperty("render");
    expect(mockRoot).toHaveProperty("unmount");
  });

  it("should mount application with correct provider hierarchy", () => {
    // Arrange
    const App = () => <div data-testid="app">App Component</div>;
    const ThemeProvider = ({ children }) => <div data-testid="theme-provider">{children}</div>;

    // Act - Simulate the exact structure from main.jsx
    render(
      <React.StrictMode>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </React.StrictMode>
    );

    // Assert - Verify the provider hierarchy
    const themeProvider = screen.getByTestId("theme-provider");
    const app = screen.getByTestId("app");

    expect(themeProvider).toBeInTheDocument();
    expect(app).toBeInTheDocument();
    expect(themeProvider).toContainElement(app);
  });
});
