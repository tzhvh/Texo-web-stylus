import React, { useState, useEffect, useRef } from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

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

export default function OCRPage() {
  const [latex, setLatex] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({});
  const [loadingMessage, setLoadingMessage] = useState("Initializing model...");
  const workerRef = useRef(null);
  const fileInputRef = useRef(null);

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
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      return;
    }

    // Clean up previous preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setIsLoading(true);

    if (!isReady) {
      alert("Model is still loading, please wait...");
      setIsLoading(false);
      return;
    }

    console.log("OCRPage - File size:", file.size, "bytes");
    console.log("OCRPage - File type:", file.type);

    // Create and log a URL for the blob to see the actual image
    const blobUrl = URL.createObjectURL(file);
    console.log("OCRPage - Blob URL:", blobUrl);

    // Create a temporary image to see what's being sent
    const img = new Image();
    img.onload = () => {
      console.log("OCRPage - Image dimensions:", img.width, "x", img.height);
      URL.revokeObjectURL(blobUrl); // Clean up
    };
    img.src = blobUrl;

    workerRef.current.postMessage({
      action: "predict",
      image: file,
      key: "predict",
    });
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) handleFile(file);
        break;
      }
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(latex)
      .then(() => alert("LaTeX copied to clipboard!"))
      .catch((err) => alert("Failed to copy: " + err.message));
  };

  const loadExampleImage = () => {
    fetch("/test_img/test.png")
      .then((r) => {
        if (!r.ok) throw new Error("Example image not found");
        return r.blob();
      })
      .then((b) => handleFile(new File([b], "test.png", { type: "image/png" })))
      .catch((err) => {
        console.error("Failed to load example:", err);
        alert("Example image not available");
      });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          LaTeX OCR Recognition
        </h1>
        <p className="text-gray-600 mt-2">
          Upload or paste an image containing mathematical formulas to convert
          them to LaTeX. Texo OCR model under AGPL from Sicheng Mao
        </p>
      </div>

      {!isReady && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-blue-700">{loadingMessage}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Upload Image
          </h2>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg w-full h-80 flex items-center justify-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-50"
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onPaste={onPaste}
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center p-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload, drag & drop, or paste an image
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={loadExampleImage}
              disabled={!isReady}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Load Example
            </button>
            <button
              onClick={() => {
                setImagePreview(null);
                setLatex("");
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded transition"
            >
              Clear
            </button>
          </div>
          {isLoading && (
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              Processing image...
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
