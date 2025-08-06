import React from "react";
import useTheme from "../hooks/useTheme.js";
import ConnectivityStatus from "./ConnectivityStatus.jsx";

const Layout = ({ children }) => {
  // Initialize theme hook to handle dark mode
  useTheme();

  return (
    <>
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div
        className="min-h-screen transition-colors duration-200"
        style={{
          backgroundColor: "var(--background)",
          color: "var(--text-primary)",
        }}
      >
        {/* Connectivity Status Indicator */}
        <ConnectivityStatus />

        <main id="main-content">{children}</main>
      </div>
    </>
  );
};

export default Layout;
