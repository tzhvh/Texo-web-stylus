import React, { useState } from 'react'
import { BlockMath, InlineMath } from 'react-katex'
import 'katex/dist/katex.min.css'

export default function CommentPage() {
  const [comment, setComment] = useState('')
  const [preview, setPreview] = useState('')

  const handleCommentChange = (e) => {
    const value = e.target.value
    setComment(value)
    // Update preview with a small delay
    clearTimeout(window.previewTimeout)
    window.previewTimeout = setTimeout(() => {
      setPreview(value)
    }, 300)
  }

  const renderLatexInText = (text) => {
    if (!text) return null

    // Split by $$ for block math
    const parts = text.split(/(\$\$[\s\S]*?\$\$)/g)

    return parts.map((part, i) => {
      // Block math
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2).trim()
        return (
          <div key={i} className="my-4">
            <BlockMath math={latex} />
          </div>
        )
      }

      // Split remaining text by $ for inline math
      const inlineParts = part.split(/(\$[^$]+?\$)/g)
      return inlineParts.map((inlinePart, j) => {
        if (inlinePart.startsWith('$') && inlinePart.endsWith('$')) {
          const latex = inlinePart.slice(1, -1)
          return <InlineMath key={`${i}-${j}`} math={latex} />
        }
        return <span key={`${i}-${j}`}>{inlinePart}</span>
      })
    })
  }

  const clearComment = () => {
    setComment('')
    setPreview('')
  }

  const insertSample = () => {
    const sample = `This is a sample comment with LaTeX formulas.

Inline formula: The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$

Block formula:
$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Another inline: Einstein's famous equation $E = mc^2$ relates energy and mass.

More complex formula:
$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$`
    setComment(sample)
    setPreview(sample)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Comment with LaTeX</h1>
        <p className="text-gray-600 mt-2">
          Write comments with inline ($formula$) or block ($$formula$$) LaTeX formulas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Editor Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Editor</h2>
            <div className="flex gap-2">
              <button
                onClick={insertSample}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
              >
                Insert Sample
              </button>
              <button
                onClick={clearComment}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                Clear
              </button>
            </div>
          </div>

          <textarea
            value={comment}
            onChange={handleCommentChange}
            placeholder="Type your comment here...&#10;&#10;Use $formula$ for inline LaTeX&#10;Use $$formula$$ for block LaTeX&#10;&#10;Example: The area of a circle is $A = \\pi r^2$"
            rows={20}
            className="w-full p-4 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none font-mono text-sm"
          />

          {/* Syntax Help */}
          <div className="mt-4 p-4 bg-gray-50 rounded border text-sm">
            <h3 className="font-semibold mb-2">LaTeX Syntax Tips:</h3>
            <ul className="space-y-1 text-gray-600">
              <li>• Inline: <code className="bg-gray-200 px-1 rounded">$x^2 + y^2 = r^2$</code></li>
              <li>• Block: <code className="bg-gray-200 px-1 rounded">$$\int f(x) dx$$</code></li>
              <li>• Fractions: <code className="bg-gray-200 px-1 rounded">\frac{"{a}"}{"{b}"}</code></li>
              <li>• Square root: <code className="bg-gray-200 px-1 rounded">\sqrt{"{x}"}</code></li>
              <li>• Subscript/Superscript: <code className="bg-gray-200 px-1 rounded">x_i^2</code></li>
            </ul>
          </div>
        </div>

        {/* Preview Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Preview</h2>
          <div className="min-h-[500px] p-4 bg-gray-50 rounded border prose max-w-none">
            {preview ? (
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {renderLatexInText(preview)}
              </div>
            ) : (
              <p className="text-gray-500 text-center mt-10">
                Preview will appear here as you type
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About This Feature</h3>
        <p className="text-blue-800 text-sm">
          This page allows you to write comments or notes that include mathematical formulas
          using LaTeX syntax. The preview updates in real-time as you type. You can use the
          recognized LaTeX from the OCR page and paste it here to create formatted documents.
        </p>
      </div>
    </div>
  )
}
