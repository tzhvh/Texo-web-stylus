import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl mx-auto text-center">
        {/* Hero Section */}
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Welcome to <span className="text-blue-600">Texo</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Convert mathematical formulas from images to LaTeX instantly
        </p>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Powered by state-of-the-art machine learning models, Texo helps you recognize
          and convert handwritten or printed mathematical formulas into editable LaTeX code.
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center mb-16">
          <Link
            to="/ocr"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition transform hover:scale-105"
          >
            Try OCR Now
          </Link>
          <a
            href="https://github.com/alephpi/Texo-web"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg shadow-md transition transform hover:scale-105"
          >
            View on GitHub
          </a>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="text-blue-600 text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Fast & Accurate</h3>
            <p className="text-gray-600">
              State-of-the-art OCR model for precise formula recognition
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="text-blue-600 text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">Privacy First</h3>
            <p className="text-gray-600">
              All processing happens in your browser, no data sent to servers
            </p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-sm border">
            <div className="text-blue-600 text-4xl mb-4">✨</div>
            <h3 className="text-xl font-semibold mb-2">Easy to Use</h3>
            <p className="text-gray-600">
              Simply upload, paste, or drag & drop your formula images
            </p>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            Built with React, Transformers.js, and Hugging Face models
          </p>
        </div>
      </div>
    </div>
  )
}
