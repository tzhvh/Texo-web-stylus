import React, { createContext, useContext, useState, useEffect } from "react";

const DebugContext = createContext();

export function DebugProvider({ children }) {
  const [debugMode, setDebugMode] = useState(() => {
    // Initialize from localStorage, default to true
    const stored = localStorage.getItem("texo-debug-mode");
    return stored !== null ? stored === "true" : true;
  });

  useEffect(() => {
    // Persist to localStorage
    localStorage.setItem("texo-debug-mode", debugMode.toString());

    // Update logger debug level
    if (window.__TEXO_LOGGER__) {
      window.__TEXO_LOGGER__.setDebugMode(debugMode);
    }
  }, [debugMode]);

  const toggleDebug = () => setDebugMode((prev) => !prev);

  return (
    <DebugContext.Provider value={{ debugMode, setDebugMode, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error("useDebug must be used within a DebugProvider");
  }
  return context;
}
