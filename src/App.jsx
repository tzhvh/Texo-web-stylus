import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import OCRPage from "./pages/OCRPage";
import SketchPage from "./pages/SketchPage";
import ComposePage from "./pages/ComposePage";
import DatabasePage from "./pages/DatabasePage";
import { DebugProvider, useDebug } from "./contexts/DebugContext";

function AppContent() {
  const { debugMode, toggleDebug } = useDebug();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
        <Link to="/" className="text-2xl text-grey-600 hover:text-blue-700">
          Transcription
        </Link>
        <div className="flex items-center space-x-6">
          <nav className="flex items-center space-x-6">
            <Link
              to="/ocr"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Recognize
            </Link>
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Sketch
            </Link>
            <Link
              to="/compose"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Compose
            </Link>
            <Link
              to="/database"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Database
            </Link>
          </nav>
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={debugMode}
              onChange={toggleDebug}
              className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
            />
            <span
              className={`text-sm font-medium transition ${
                debugMode ? "text-green-600" : "text-gray-600"
              }`}
            >
              Debug
            </span>
          </label>
        </div>
      </header>
      <main className="flex-grow">
        <Routes>
          <Route path="/ocr" element={<OCRPage />} />
          <Route path="/" element={<SketchPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/database" element={<DatabasePage />} />
        </Routes>
      </main>
      <footer className="bg-white border-t p-4 text-center text-sm text-gray-500">
        WIP
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DebugProvider>
        <AppContent />
      </DebugProvider>
    </BrowserRouter>
  );
}
