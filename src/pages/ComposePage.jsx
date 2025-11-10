import React, { useState, useEffect, useRef } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { inputRules } from "prosemirror-inputrules";
import {
  chainCommands,
  deleteSelection,
  selectNodeBackward,
  joinBackward,
  baseKeymap,
} from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import {
  mathPlugin,
  mathBackspaceCmd,
  insertMathCmd,
  mathSerializer,
  makeInlineMathInputRule,
  makeBlockMathInputRule,
  REGEX_INLINE_MATH_DOLLARS,
  REGEX_BLOCK_MATH_DOLLARS,
} from "@benrbray/prosemirror-math";
import "@benrbray/prosemirror-math/dist/prosemirror-math.css";
import "katex/dist/katex.min.css";
import { BlockMath } from "react-katex";
import {
  checkEquivalence,
  checkMultipleLines,
} from "../cas/equivalenceChecker.js";
import {
  createSpatialMapping,
  findErrorSubExpression,
  highlightRanges,
} from "../utils/spatialMapping.js";
import {
  getCachedCanonicalForm,
  cacheCanonicalForm,
  getCacheStats,
} from "../utils/indexedDBCache.js";

// ProseMirror Schema with math nodes
const mathSchema = new Schema({
  nodes: {
    doc: {
      content: "block+",
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() {
        return ["p", 0];
      },
    },
    math_inline: {
      group: "inline math",
      content: "text*",
      inline: true,
      atom: true,
      toDOM: () => ["math-inline", { class: "math-node" }, 0],
      parseDOM: [{ tag: "math-inline" }],
    },
    math_display: {
      group: "block math",
      content: "text*",
      atom: true,
      code: true,
      toDOM: () => ["math-display", { class: "math-node" }, 0],
      parseDOM: [{ tag: "math-display" }],
    },
    text: {
      group: "inline",
    },
  },
});

export default function ComposePage() {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [mathLines, setMathLines] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const debounceTimerRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);

  // Initialize ProseMirror editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    // Create input rules
    const inlineMathInputRule = makeInlineMathInputRule(
      REGEX_INLINE_MATH_DOLLARS,
      mathSchema.nodes.math_inline,
    );
    const blockMathInputRule = makeBlockMathInputRule(
      REGEX_BLOCK_MATH_DOLLARS,
      mathSchema.nodes.math_display,
    );

    // Create plugins
    const plugins = [
      history(),
      mathPlugin,
      keymap({
        "Mod-Space": insertMathCmd(mathSchema.nodes.math_inline),
        Backspace: chainCommands(
          deleteSelection,
          mathBackspaceCmd,
          joinBackward,
          selectNodeBackward,
        ),
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
      }),
      keymap(baseKeymap),
      inputRules({ rules: [inlineMathInputRule, blockMathInputRule] }),
    ];

    // Create editor state
    const state = EditorState.create({
      schema: mathSchema,
      plugins: plugins,
    });

    // Create editor view
    const view = new EditorView(editorRef.current, {
      state,
      clipboardTextSerializer: (slice) => mathSerializer.serializeSlice(slice),
      dispatchTransaction(transaction) {
        const newState = view.state.apply(transaction);
        view.updateState(newState);

        // Extract math content and trigger validation
        if (transaction.docChanged) {
          extractAndValidate(newState);
        }
      },
    });

    viewRef.current = view;

    // Load cache stats
    updateCacheStats();

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Extract math expressions from editor and trigger validation
  const extractAndValidate = (state) => {
    const lines = [];
    const doc = state.doc;

    doc.descendants((node, pos) => {
      if (node.type.name === "math_display") {
        const content = node.textContent;
        if (content.trim()) {
          lines.push({
            latex: content,
            pos: pos,
            type: "display",
          });
        }
      } else if (node.type.name === "math_inline") {
        const content = node.textContent;
        if (content.trim()) {
          lines.push({
            latex: content,
            pos: pos,
            type: "inline",
          });
        }
      }
    });

    setMathLines(lines);

    // Debounce validation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      validateMathLines(lines);
    }, 500); // 500ms debounce
  };

  // Validate math lines for equivalence
  const validateMathLines = async (lines) => {
    if (lines.length < 2) {
      setValidationResults([]);
      return;
    }

    setIsValidating(true);

    try {
      // Extract just the display math lines (one equation per line)
      const displayLines = lines
        .filter((line) => line.type === "display")
        .map((line) => line.latex);

      if (displayLines.length < 2) {
        setValidationResults([]);
        setIsValidating(false);
        return;
      }

      // Check each line against the previous one
      const results = [];

      for (let i = 1; i < displayLines.length; i++) {
        const prevLatex = displayLines[i - 1];
        const currLatex = displayLines[i];

        // Check cache first
        const cacheKey = `${prevLatex}|${currLatex}`;
        let cached = await getCachedCanonicalForm(cacheKey);

        let result;
        if (cached) {
          result = cached.result;
          result.cached = true;
        } else {
          // Perform equivalence check
          result = checkEquivalence(prevLatex, currLatex);

          // Cache the result
          await cacheCanonicalForm(cacheKey, result.canonical1 || "", {
            result: result,
            prevLatex,
            currLatex,
          });
        }

        // Create spatial mapping for error highlighting
        const mapping = result.equivalent
          ? null
          : createSpatialMapping(currLatex, result.canonical2);

        results.push({
          lineNumber: i + 1,
          prevLatex,
          currLatex,
          equivalent: result.equivalent,
          method: result.method,
          time: result.time,
          error: result.error,
          mapping,
          cached: result.cached || false,
        });
      }

      setValidationResults(results);
      updateCacheStats();
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidating(false);
    }
  };

  // Update cache statistics
  const updateCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error("Error fetching cache stats:", error);
    }
  };

  // Insert sample equations with direct node creation
  const insertSample = () => {
    if (!viewRef.current) return;

    const view = viewRef.current;
    const { state, dispatch } = view;
    const { schema } = state;

    // Clear existing content first
    const clearTransaction = state.tr.delete(0, state.doc.content.size);
    dispatch(clearTransaction);

    // Define the sample content as structured nodes
    const sampleContent = [
      { type: "paragraph", content: "Sample mathematical proof:" },
      { type: "paragraph", content: "Start with the equation:" },
      { type: "math_display", content: "x^2 + 4x + 4" },
      { type: "paragraph", content: "Factor the quadratic:" },
      { type: "math_display", content: "(x + 2)^2" },
      { type: "paragraph", content: "Expand to verify:" },
      { type: "math_display", content: "x^2 + 2 \\cdot 2x + 2^2" },
      { type: "paragraph", content: "Simplify:" },
      { type: "math_display", content: "x^2 + 4x + 4" },
      {
        type: "paragraph",
        content: "This demonstrates equivalence checking with the CAS system!",
      },
    ];

    // Insert content with proper node creation
    const tr = view.state.tr;
    const nodes = [];

    // Create all nodes first
    sampleContent.forEach((item) => {
      if (item.type === "paragraph") {
        if (item.content.trim()) {
          const paragraph = schema.nodes.paragraph.createAndFill(
            null,
            schema.text(item.content),
          );
          if (paragraph) {
            nodes.push(paragraph);
          }
        }
      } else if (item.type === "math_display") {
        // Create math display node
        const mathNode = schema.nodes.math_display.createAndFill(
          null,
          schema.text(item.content),
        );
        if (mathNode) {
          nodes.push(mathNode);
        }
      }
    });

    // Insert all nodes at position 0
    if (nodes.length > 0) {
      tr.insert(0, nodes);
    }

    // Dispatch the transaction to update the editor
    dispatch(tr);
  };

  // Clear editor
  const clearEditor = () => {
    if (!viewRef.current) return;

    const state = EditorState.create({
      schema: mathSchema,
      plugins: viewRef.current.state.plugins,
    });

    viewRef.current.updateState(state);
    setMathLines([]);
    setValidationResults([]);
  };

  // Get status icon for validation result
  const getStatusIcon = (result) => {
    if (result.equivalent) {
      return <span className="text-green-600 font-bold text-xl">✓</span>;
    } else {
      return <span className="text-red-600 font-bold text-xl">✗</span>;
    }
  };

  // Get status color class
  const getStatusColorClass = (result) => {
    if (result.equivalent) {
      return "bg-green-50 border-green-300";
    } else {
      return "bg-red-50 border-red-300";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Math CAS Checker</h1>
        <p className="text-gray-600 mt-2">
          Write mathematical equations line-by-line. Each line is automatically
          checked for equivalence with the previous line.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor Section */}
        <div className="lg:col-span-2 border rounded-lg p-6 bg-white shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Math Editor</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                {showHelp ? "Hide" : "Show"} Help
              </button>
              <button
                onClick={insertSample}
                className="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition"
              >
                Insert Sample
              </button>
              <button
                onClick={clearEditor}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                Clear
              </button>
            </div>
          </div>

          {showHelp && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
              <h3 className="font-semibold mb-2">Quick Guide:</h3>
              <ul className="space-y-1 text-gray-700">
                <li>
                  • Type <code className="bg-blue-100 px-1 rounded">$$</code>{" "}
                  followed by space for block math
                </li>
                <li>
                  • Type{" "}
                  <code className="bg-blue-100 px-1 rounded">$formula$</code>{" "}
                  for inline math
                </li>
                <li>
                  • Press{" "}
                  <code className="bg-blue-100 px-1 rounded">
                    Ctrl/Cmd+Space
                  </code>{" "}
                  to insert inline math
                </li>
                <li>
                  • Each display equation ($$...$$) on a new line is checked
                  against the previous one
                </li>
                <li>• Green ✓ means equivalent, Red ✗ means not equivalent</li>
              </ul>
            </div>
          )}

          {/* ProseMirror Editor Container */}
          <div
            ref={editorRef}
            className="border rounded-lg p-4 min-h-[400px] focus-within:ring-2 focus-within:ring-blue-500 prose max-w-none"
            style={{
              background: "#fafafa",
              fontFamily: "ui-monospace, monospace",
            }}
          />

          {/* Validation Status */}
          {isValidating && (
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Validating expressions...
            </div>
          )}

          {/* Cache Stats */}
          {cacheStats && (
            <div className="mt-4 text-xs text-gray-500">
              Cache: {cacheStats.count} entries
            </div>
          )}
        </div>

        {/* Validation Results Sidebar */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Validation Results
          </h2>

          {mathLines.filter((l) => l.type === "display").length < 2 ? (
            <p className="text-gray-500 text-sm">
              Enter at least two display equations ($$...$$) to see validation
              results.
            </p>
          ) : (
            <div className="space-y-3">
              {validationResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 border rounded-lg ${getStatusColorClass(result)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      Line {result.lineNumber}
                    </span>
                    {getStatusIcon(result)}
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <div>
                      Method: <span className="font-mono">{result.method}</span>
                    </div>
                    <div>
                      Time:{" "}
                      <span className="font-mono">
                        {result.time.toFixed(2)}ms
                      </span>
                    </div>
                    {result.cached && (
                      <div className="text-green-600">✓ From cache</div>
                    )}
                    {result.error && (
                      <div className="text-red-600 mt-1">
                        Error: {result.error}
                      </div>
                    )}
                  </div>

                  {/* Show LaTeX preview for non-equivalent lines */}
                  {!result.equivalent && (
                    <div className="mt-2 p-2 bg-white rounded text-xs">
                      <div className="font-semibold mb-1">Current:</div>
                      <div className="overflow-x-auto">
                        <BlockMath math={result.currLatex} />
                      </div>
                      <div className="font-semibold mt-2 mb-1">Previous:</div>
                      <div className="overflow-x-auto">
                        <BlockMath math={result.prevLatex} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
