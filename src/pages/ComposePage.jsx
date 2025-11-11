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
import { Decoration, DecorationSet } from "prosemirror-view";
import { Plugin, PluginKey } from "prosemirror-state";
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
  EquivalenceConfig,
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
import {
  saveSessionState,
  loadSessionState,
} from "../utils/workspaceDB.js";
import Logger from "../utils/logger.js";

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

// Create a plugin key for the validation plugin
const validationPluginKey = new PluginKey("validation");

// Validation plugin for creating decorations
const createValidationPlugin = () => {
  return new Plugin({
    key: validationPluginKey,
    state: {
      init() {
        return DecorationSet.empty;
      },
      apply(tr, oldSet) {
        // Check for new decoration set in transaction metadata
        const newSet = tr.getMeta(validationPluginKey);
        if (newSet !== undefined) {
          return newSet;
        }

        // Re-map decorations through transactions
        if (tr.docChanged) {
          return oldSet.map(tr.mapping, tr.doc);
        }
        return oldSet;
      },
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
};

export default function ComposePage() {
  const editorRef = useRef(null);
  const viewRef = useRef(null);
  const [mathLines, setMathLines] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [isValidating, setIsValidating] = useState(false);
  const [cacheStats, setCacheStats] = useState(null);
  const debounceTimerRef = useRef(null);
  const [showHelp, setShowHelp] = useState(false);
  const [debugMode, setDebugMode] = useState(true); // Default to true
  const [forceAlgebrite, setForceAlgebrite] = useState(false); // Force Algebrite usage

  // Load debug mode from session state on mount
  useEffect(() => {
    const loadDebugSetting = async () => {
      const savedDebug = await loadSessionState('debugMode');
      if (savedDebug !== null) {
        setDebugMode(savedDebug);
        Logger.setDebugMode(savedDebug);
      } else {
        // Default to true
        Logger.setDebugMode(true);
      }
    };
    loadDebugSetting();
  }, []);

  // Save debug mode to session state and sync with Logger when it changes
  useEffect(() => {
    saveSessionState('debugMode', debugMode);
    Logger.setDebugMode(debugMode);

    // Log the toggle action
    Logger.info('ComposePage', `Debug mode ${debugMode ? 'ENABLED' : 'DISABLED'}`, {
      debugMode,
      timestamp: Date.now()
    }, ['config', 'debug-toggle']);
  }, [debugMode]);

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

    // Create validation plugin instance
    const validationPlugin = createValidationPlugin();

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
      validationPlugin,
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
      const displayLines = lines.filter((line) => line.type === "display");
      const displayLatex = displayLines.map((line) => line.latex);

      if (displayLatex.length < 2) {
        setValidationResults([]);
        setIsValidating(false);
        return;
      }

      // Check each line against the previous one
      const results = [];

      for (let i = 1; i < displayLines.length; i++) {
        const prevLine = displayLines[i - 1];
        const currLine = displayLines[i];
        const prevLatex = prevLine.latex;
        const currLatex = currLine.latex;

        // Check cache first (skip if force mode is active)
        const cacheKey = `${prevLatex}|${currLatex}`;
        let cached = forceAlgebrite ? null : await getCachedCanonicalForm(cacheKey);

        let result;
        if (cached) {
          result = cached.result;
          result.cached = true;
        } else {
          // Perform equivalence check with debug flag
          result = checkEquivalence(prevLatex, currLatex, {
            ...EquivalenceConfig,
            debug: debugMode,
            forceAlgebrite: forceAlgebrite  // Pass force flag
          });

          // Cache the result (skip if force mode is active)
          if (!forceAlgebrite) {
            await cacheCanonicalForm(cacheKey, result.canonical1 || "", {
              result: result,
              prevLatex,
              currLatex,
            });
          }
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
          nodePos: currLine.pos, // Position of the current node
          prevNodePos: prevLine.pos, // Position of the previous node
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

  // Apply decorations when validation results change
  useEffect(() => {
    if (!viewRef.current) return;

    const view = viewRef.current;
    const { state } = view;

    // Create decorations for validation results
    const decorations = [];

    validationResults.forEach((result) => {
      // Highlight both the current and previous nodes
      const positions = [result.nodePos, result.prevNodePos];

      positions.forEach((pos) => {
        if (pos !== undefined) {
          // Find the node at this position
          const $pos = state.doc.resolve(pos);
          const node = $pos.nodeAfter;

          if (
            node &&
            (node.type.name === "math_display" ||
              node.type.name === "math_inline")
          ) {
            // Apply the appropriate class based on equivalence
            const className = result.equivalent
              ? "bg-green-50 border-green-300 border rounded inline-block"
              : "bg-red-50 border-red-300 border rounded inline-block";

            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: className,
              }),
            );
          }
        }
      });
    });

    // Create new decoration set
    const newDecorationSet = DecorationSet.create(state.doc, decorations);

    // Create transaction to update the validation plugin state
    const tr = state.tr.setMeta(validationPluginKey, newDecorationSet);
    view.dispatch(tr);
  }, [validationResults]);

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
            <div className="flex gap-3 items-center">
              {/* Prominent Debug Toggle */}
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                debugMode
                  ? 'bg-green-50 border-green-500 text-green-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}>
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium text-sm">
                  {debugMode ? '🐛 Debug ON' : 'Debug OFF'}
                </span>
              </label>

              {/* Force Algebrite Toggle */}
              <label className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                forceAlgebrite
                  ? 'bg-orange-50 border-orange-500 text-orange-700'
                  : 'bg-gray-50 border-gray-300 text-gray-600'
              }`}
              title="Skip fast canonicalization and force Algebrite CAS">
                <input
                  type="checkbox"
                  checked={forceAlgebrite}
                  onChange={(e) => setForceAlgebrite(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="font-medium text-sm">
                  {forceAlgebrite ? '⚡ Force Algebrite' : 'Force Algebrite'}
                </span>
              </label>

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

          {/* Debug Mode Confirmation Banner */}
          {debugMode && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <span className="text-green-700 text-sm font-medium">
                ✓ Debug logging is active - check browser console and Database page for detailed logs
              </span>
            </div>
          )}

          {/* Force Algebrite Mode Warning Banner */}
          {forceAlgebrite && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-300 rounded-lg flex items-center gap-2">
              <span className="text-orange-700 text-sm font-medium">
                ⚠️ Force Algebrite Mode Active - Cache disabled, using slower but comprehensive CAS engine
              </span>
            </div>
          )}

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
