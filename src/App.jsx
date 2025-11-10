import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import OCRPage from './pages/OCRPage'
import SketchPage from './pages/SketchPage'
import ComposePage from './pages/ComposePage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b">
          <Link to="/" className="text-2xl text-grey-600 hover:text-blue-700">
            Transcription
          </Link>
          <nav className="space-x-6">
            <Link
              to="/"
              className="text-gray-700 hover:text-blue-600 font-medium transition"
            >
              Recognize
            </Link>
            <Link
              to="/sketch"
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
          </nav>
        </header>
        <main className="flex-grow">
          <Routes>
          {/*<Route path="/" element={<HomePage />} />*/}
          {/*<Route path="/ocr" element={<OCRPage />} />*/}
            <Route path="/" element={<OCRPage />} />
            <Route path="/sketch" element={<SketchPage />} />
            <Route path="/compose" element={<ComposePage />} />
          </Routes>
        </main>
        <footer className="bg-white border-t p-4 text-center text-sm text-gray-500">
          Texo under AGPL from Sicheng Mao (thanks) • Powered by React & Transformers.js
        </footer>
      </div>
    </BrowserRouter>
  )
}
