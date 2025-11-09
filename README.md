# Texo - LaTeX OCR Recognition

A minimal React SPA for converting mathematical formulas from images to LaTeX using Hugging Face Transformers.js.

## Features

- 🚀 **Fast & Accurate** - State-of-the-art OCR model for precise formula recognition
- 🔒 **Privacy First** - All processing happens in your browser, no data sent to servers
- ✨ **Easy to Use** - Simply upload, paste, or drag & drop your formula images
- 📝 **Compose with LaTeX** - Write composes with inline and block LaTeX formulas

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Transformers.js** - Run ML models in the browser
- **KaTeX** - Fast math rendering
- **image-js** - Image processing utilities

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
Texo-web-stylus/
├── public/
│   └── test_img/          # Test formula images
├── src/
│   ├── pages/
│   │   ├── HomePage.jsx   # Landing page
│   │   ├── OCRPage.jsx    # OCR recognition page
│   │   └── ComposePage.jsx # LaTeX compose editor
│   ├── workers/
│   │   ├── ocrWorker.js   # Web Worker for OCR processing
│   │   └── imageProcessor.js # Image preprocessing utilities
│   ├── App.jsx            # Main app component with routing
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles with Tailwind
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## Usage

### OCR Recognition

1. Navigate to the "Recognize" page
2. Upload an image containing a mathematical formula
3. Wait for the model to process (first load may take some time)
4. View the recognized LaTeX code and preview
5. Copy the LaTeX to your clipboard

### Compose with LaTeX

1. Navigate to the "Compose" page
2. Write text with inline (`$formula$`) or block (`$$formula$$`) LaTeX
3. See real-time preview of your formatted text

## Model Information

This application uses the **FormulaNet** model from Hugging Face:
- Model: `alephpi/FormulaNet`
- Architecture: Vision Encoder-Decoder
- Task: Image-to-LaTeX conversion

## Development

The application uses Web Workers to run the OCR model without blocking the main thread. This ensures a smooth user experience even during intensive computations.

### Key Components

- **OCRPage**: Handles image upload, worker communication, and result display
- **OCR Worker**: Loads the model and performs inference
- **Image Processor**: Preprocesses images to the required format

## License

See [LICENSE](LICENSE) file for details.

## Credits

© 2025 Sicheng Mao • Powered by React & Transformers.js

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
