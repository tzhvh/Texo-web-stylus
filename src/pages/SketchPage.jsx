import React, { useState, useEffect, useRef } from "react";
import {
  Excalidraw,
  exportToBlob,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import "@excalidraw/excalidraw/index.css";

// Web Worker
import OCRWorker from "../workers/ocrWorker?worker";

// Constants
const RemoteSource = {
  global: {
    modelName: "alephpi/FormulaNet",
    env_config: {
      remoteHost: "https://huggingface.co/",
      remotePathTemplate: "{model}/resolve/{revision}",
    },
  },
  cn: {
    modelName: "alephpi/FormulaNet",
    env_config: {
      remoteHost: "https://gh.llkk.cc/https://raw.githubusercontent.com/",
      remotePathTemplate: "alephpi/Texo-web/refs/heads/master/models/model/",
    },
  },
};

// Additional CSS to fix Excalidraw pointer offset issue
const excalidrawStyles = `
  .excalidraw {
    position: relative !important;
  }

  .excalidraw__canvas {
    position: relative !important;
  }
`;

// OCR bounding box configuration (384x384 pixels)
const OCR_BOX_X = 50;
const OCR_BOX_Y = 50;
const OCR_BOX_SIZE = 384;

// Create the bounding box element
const createBoundingBox = () => {
  const elements = convertToExcalidrawElements([
    {
      type: "rectangle",
      x: OCR_BOX_X,
      y: OCR_BOX_Y,
      width: OCR_BOX_SIZE,
      height: OCR_BOX_SIZE,
      strokeColor: "#2563eb",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "dashed",
      roughness: 0,
      opacity: 60,
      locked: true,
    },
  ]);
  return elements[0];
};

export default function SketchPage() {
  const [latex, setLatex] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({});
  const [loadingMessage, setLoadingMessage] = useState("Initializing model...");
  const [excalidrawAPI, setExcalidrawAPI] = useState(null);
  const [autoConvert, setAutoConvert] = useState(false);
  const [timerProgress, setTimerProgress] = useState(0);
  const workerRef = useRef(null);
  const boundingBoxRef = useRef(createBoundingBox());
  const timerRef = useRef(null);
  const lastElementsCountRef = useRef(0);

  // Initialize worker
  useEffect(() => {
    const worker = new OCRWorker();
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const { type, ...data } = e.data;
      if (type === "ready") {
        setIsReady(true);
        setIsLoading(false);
        setLoadingMessage("Model loaded successfully!");
        console.log("Model loaded and ready");
      } else if (type === "progress") {
        const percent = data.total
          ? Math.round((data.loaded / data.total) * 100)
          : 0;
        setProgress((prev) => ({
          ...prev,
          [data.file]: { loaded: data.loaded, total: data.total, percent },
        }));
        setLoadingMessage(`Loading ${data.file}: ${percent}%`);
      } else if (type === "result") {
        setLatex(data.output);
        setIsLoading(false);
        console.log(`Recognition completed in ${data.time}s`);
      } else if (type === "error") {
        console.error("Worker error:", data.error);
        alert("Error: " + data.error);
        setIsLoading(false);
      }
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      alert("Worker error: " + error.message);
      setIsLoading(false);
    };

    // Try loading model
    const loadModel = async () => {
      setIsLoading(true);
      let source = RemoteSource.global;
      try {
        const res = await fetch(
          "https://huggingface.co/alephpi/FormulaNet/resolve/main/config.json",
          {
            method: "HEAD",
          },
        );
        if (!res.ok) throw new Error("Cannot reach Hugging Face");
      } catch {
        console.log("Using CN mirror");
        source = RemoteSource.cn;
      }
      worker.postMessage({ action: "init", modelConfig: source });
    };

    loadModel();

    return () => {
      worker.terminate();
    };
  }, []);

  const convertToLatex = async () => {
    if (!excalidrawAPI) {
      alert("Canvas not ready");
      return;
    }

    if (!isReady) {
      alert("Model is still loading, please wait...");
      return;
    }

    const allElements = excalidrawAPI.getSceneElements();

    // Filter elements within the OCR bounding box (exclude the box itself)
    const elementsInBox = allElements.filter((el) => {
      if (el.id === boundingBoxRef.current.id) return false; // Skip the bounding box itself
      if (el.isDeleted) return false;

      // Check if element is within the bounding box
      const elRight = el.x + (el.width || 0);
      const elBottom = el.y + (el.height || 0);
      const boxRight = OCR_BOX_X + OCR_BOX_SIZE;
      const boxBottom = OCR_BOX_Y + OCR_BOX_SIZE;

      // Element must be at least partially within the box
      return !(
        el.x > boxRight ||
        elRight < OCR_BOX_X ||
        el.y > boxBottom ||
        elBottom < OCR_BOX_Y
      );
    });

    if (elementsInBox.length === 0) {
      alert("Please draw something inside the blue bounding box!");
      return;
    }

    try {
      setIsLoading(true);

      // Export only the bounding box area with white background
      const blob = await exportToBlob({
        elements: elementsInBox,
        appState: {
          ...excalidrawAPI.getAppState(),
          exportBackground: true,
          viewBackgroundColor: "#ffffff",
        },
        files: excalidrawAPI.getFiles(),
        getDimensions: () => ({
          width: OCR_BOX_SIZE,
          height: OCR_BOX_SIZE,
          // Translate to start from (0, 0)
        }),
        exportPadding: 0,
      });

      // Convert blob to file
      const file = new File([blob], "sketch.png", { type: "image/png" });

      // Send to worker for OCR processing
      workerRef.current.postMessage({
        action: "predict",
        image: file,
        key: "predict",
      });
    } catch (error) {
      console.error("Error converting sketch:", error);
      alert("Failed to convert sketch: " + error.message);
      setIsLoading(false);
    }
  };

  const clearCanvas = () => {
    if (excalidrawAPI) {
      // Reset scene but keep the bounding box
      excalidrawAPI.updateScene({
        elements: [boundingBoxRef.current],
      });
      setLatex("");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(latex)
      .then(() => alert("LaTeX copied to clipboard!"))
      .catch((err) => alert("Failed to copy: " + err.message));
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        convertToLatex();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [excalidrawAPI, isReady]);

  // Auto-convert timer (5 seconds)
  useEffect(() => {
    if (!autoConvert || !isReady || !excalidrawAPI || isLoading) {
      setTimerProgress(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const TIMER_DURATION = 5000; // 5 seconds
    const UPDATE_INTERVAL = 50; // Update every 50ms for smooth animation
    let startTime = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / TIMER_DURATION) * 100, 100);

      setTimerProgress(progress);

      if (progress >= 100) {
        // Timer completed - check if there are elements to convert
        const allElements = excalidrawAPI.getSceneElements();
        const elementsInBox = allElements.filter((el) => {
          if (el.id === boundingBoxRef.current.id) return false;
          if (el.isDeleted) return false;
          const elRight = el.x + (el.width || 0);
          const elBottom = el.y + (el.height || 0);
          const boxRight = OCR_BOX_X + OCR_BOX_SIZE;
          const boxBottom = OCR_BOX_Y + OCR_BOX_SIZE;
          return !(
            el.x > boxRight ||
            elRight < OCR_BOX_X ||
            el.y > boxBottom ||
            elBottom < OCR_BOX_Y
          );
        });

        if (
          elementsInBox.length > 0 &&
          elementsInBox.length !== lastElementsCountRef.current
        ) {
          lastElementsCountRef.current = elementsInBox.length;
          convertToLatex();
        }

        // Reset timer
        startTime = Date.now();
        setTimerProgress(0);
      }
    }, UPDATE_INTERVAL);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoConvert, isReady, excalidrawAPI, isLoading]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Sketch to LaTeX</h1>
        <p className="text-gray-600 mt-2">
          Draw mathematical formulas inside the blue box (384×384px) and convert
          them to LaTeX code. Texo OCR model under AGPL from Sicheng Mao
        </p>
      </div>

      {/* Fixed height container to prevent layout shift */}
      <div className="mb-4" style={{ minHeight: "60px" }}>
        {!isReady && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-blue-700">{loadingMessage}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Drawing Canvas Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Draw Formula
          </h2>
          <div
            className="border rounded-lg overflow-hidden bg-white relative"
            style={{ height: "500px" }}
          >
            <Excalidraw
              excalidrawAPI={(api) => setExcalidrawAPI(api)}
              initialData={{
                appState: {
                  viewBackgroundColor: "#ffffff",
                  currentItemStrokeColor: "#000000",
                  currentItemBackgroundColor: "transparent",
                  currentItemFillStyle: "solid",
                  currentItemStrokeWidth: 2,
                  currentItemRoughness: 0,
                  currentItemOpacity: 100,
                },
                elements: [boundingBoxRef.current],
                scrollToContent: false,
              }}
              UIOptions={{
                canvasActions: {
                  loadScene: false,
                  export: false,
                  saveAsImage: false,
                },
              }}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={convertToLatex}
              disabled={!isReady || isLoading}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? "Converting..." : "Convert to LaTeX"}
            </button>
            <button
              onClick={clearCanvas}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
            >
              Clear Canvas
            </button>
          </div>

          {/* Auto-convert toggle and timer */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoConvert(!autoConvert)}
                disabled={!isReady}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                  autoConvert
                    ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                    autoConvert
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-400"
                  }`}
                >
                  {autoConvert && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </span>
                Auto-convert (5s)
              </button>
              <p className="text-xs text-gray-500">
                Tip: Press Ctrl/Cmd+Enter to convert manually
              </p>
            </div>

            {/* Visual timer progress bar */}
            {autoConvert && isReady && !isLoading && (
              <div className="space-y-1">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-50 ease-linear hidden"
                    style={{ width: `${timerProgress}%` }}
                  />
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded transition-all duration-200 ${
                        timerProgress > i * 20
                          ? "bg-blue-400 "
                          : "bg-gray-400 animate-pulse"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {isLoading && (
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Processing sketch...
            </div>
          )}
        </div>

        {/* Output Section */}
        <div className="space-y-6">
          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Preview
            </h2>
            <div className="min-h-[100px] p-4 bg-gray-50 rounded border">
              {latex ? (
                <div className="overflow-x-auto">
                  <BlockMath math={latex} />
                </div>
              ) : (
                <p className="text-gray-500 text-center">
                  LaTeX preview will appear here
                </p>
              )}
            </div>
          </div>

          <div className="border rounded-lg p-6 bg-white shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              LaTeX Code
            </h2>
            <textarea
              value={latex}
              onChange={(e) => setLatex(e.target.value)}
              rows={8}
              placeholder="LaTeX code will appear here..."
              className="w-full font-mono text-sm p-3 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={copyToClipboard}
                disabled={!latex}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setLatex("")}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
