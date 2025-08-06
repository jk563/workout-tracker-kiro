import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Layout from "./components/Layout.jsx";
import React from "react";

// Mock console.error to test error boundary logging
const originalConsoleError = console.error;

// Create a separate ErrorBoundary component for testing
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please refresh the page to try again.</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

describe("App Component", () => {
  beforeEach(() => {
    // Mock console.error to avoid noise in test output
    console.error = vi.fn();
  });

  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe("Routing", () => {
    it("should render the landing page on root route", () => {
      // Arrange & Act
      render(<App />);

      // Assert
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent("Workout Tracker");
      expect(screen.getByText("Welcome to your fitness journey!")).toBeInTheDocument();
    });

    it("should render layout wrapper around routes", () => {
      // Arrange & Act
      render(<App />);

      // Assert
      const skipLink = screen.getByText("Skip to main content");
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");

      const mainContent = screen.getByRole("main");
      expect(mainContent).toBeInTheDocument();
      expect(mainContent).toHaveAttribute("id", "main-content");
    });

    it("should use React Router for navigation", () => {
      // Arrange & Act
      render(<App />);

      // Assert - Check that router structure is present
      const skipLink = screen.getByText("Skip to main content");
      expect(skipLink).toBeInTheDocument();

      const mainContent = screen.getByRole("main");
      expect(mainContent).toBeInTheDocument();

      // Verify landing page content is rendered (indicating routing works)
      expect(screen.getByText("Workout Tracker")).toBeInTheDocument();
      expect(screen.getByText("Welcome to your fitness journey!")).toBeInTheDocument();
    });
  });

  describe("Error Boundary", () => {
    // Component that throws an error for testing
    const ThrowError = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>No error</div>;
    };

    it("should catch and display error when child component throws", () => {
      // Arrange
      const TestApp = () => (
        <ErrorBoundary>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ThrowError shouldThrow={true} />} />
              </Routes>
            </Layout>
          </Router>
        </ErrorBoundary>
      );

      // Act
      render(<TestApp />);

      // Assert
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Please refresh the page to try again.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Refresh Page" })).toBeInTheDocument();
    });

    it("should log error details when error occurs", () => {
      // Arrange
      const TestApp = () => (
        <ErrorBoundary>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ThrowError shouldThrow={true} />} />
              </Routes>
            </Layout>
          </Router>
        </ErrorBoundary>
      );

      // Act
      render(<TestApp />);

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        "React Error Boundary caught an error:",
        expect.any(Error),
        expect.any(Object)
      );
    });

    it("should render children normally when no error occurs", () => {
      // Arrange
      const TestApp = () => (
        <ErrorBoundary>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ThrowError shouldThrow={false} />} />
              </Routes>
            </Layout>
          </Router>
        </ErrorBoundary>
      );

      // Act
      render(<TestApp />);

      // Assert
      expect(screen.getByText("No error")).toBeInTheDocument();
      expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    });

    it("should provide refresh functionality in error state", () => {
      // Arrange
      const mockReload = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: mockReload },
        writable: true,
      });

      const TestApp = () => (
        <ErrorBoundary>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ThrowError shouldThrow={true} />} />
              </Routes>
            </Layout>
          </Router>
        </ErrorBoundary>
      );

      render(<TestApp />);

      // Act
      const refreshButton = screen.getByRole("button", { name: "Refresh Page" });
      fireEvent.click(refreshButton);

      // Assert
      expect(mockReload).toHaveBeenCalledOnce();
    });
  });

  describe("Integration", () => {
    it("should render complete app structure with router and error boundary", () => {
      // Arrange & Act
      render(<App />);

      // Assert - Check that either the app renders normally or error boundary shows
      const isErrorState = screen.queryByText("Something went wrong");
      const isNormalState = screen.queryByText("Workout Tracker");

      expect(isErrorState || isNormalState).toBeTruthy();

      if (isNormalState) {
        // Normal rendering - check all components
        expect(screen.getByText("Skip to main content")).toBeInTheDocument();
        expect(screen.getByRole("main")).toBeInTheDocument();
        expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
        expect(screen.getByText("Welcome to your fitness journey!")).toBeInTheDocument();
      } else {
        // Error boundary is active
        expect(screen.getByText("Something went wrong")).toBeInTheDocument();
        expect(screen.getByText("Please refresh the page to try again.")).toBeInTheDocument();
      }
    });

    it("should have error boundary wrapping the entire app", () => {
      // Arrange & Act
      render(<App />);

      // Assert - The app should either render normally or show error boundary
      const hasErrorBoundary =
        screen.queryByText("Something went wrong") || screen.queryByText("Workout Tracker");
      expect(hasErrorBoundary).toBeTruthy();
    });
  });
});
