/**
 * OCR Model Configuration Registry
 * Centralized configuration for easy model swapping
 */

export const OCR_MODELS = {
  formulanet: {
    id: 'formulanet',
    name: 'FormulaNet',
    huggingFaceId: 'alephpi/FormulaNet',

    // Input requirements
    inputSize: { width: 384, height: 384 },
    maintainAspectRatio: true,
    maxInputSize: { width: 768, height: 384 }, // Max before quality degrades

    // Processing parameters
    grayscale: true,
    normalize: [0, 1], // Range
    paddingColor: '#FFFFFF',

    // Performance settings
    maxTokens: 512,
    batchSize: 1, // Cannot batch due to variable content

    // Remote configuration (for Transformers.js)
    remoteHost: 'https://huggingface.co/',
    remotePathTemplate: '{model}/resolve/{revision}',

    // Tiling strategy
    preferredTileWidth: 384,
    minTileWidth: 192,
    maxTileWidth: 768,

    // Tile overlap strategy
    tileOverlap: {
      strategy: 'percentage', // 'percentage' or 'fixed'
      value: 0.35,            // 35% overlap
      minOverlap: 50,         // Minimum 50px overlap
      maxOverlap: 200         // Maximum 200px overlap
    },

    // Restorative merging configuration
    restorativeMerge: {
      enabled: true,
      similarityThreshold: 0.85,     // 85% similarity to be considered "similar"
      confidenceBoost: 'longer',      // 'longer' | 'shorter' | 'average'
      maxEditDistance: 3,             // Max characters that can differ
      debugVisualization: true        // Show overlap regions in debug mode
    },

    // Model-specific quirks/hints for optimization
    quirks: {
      sensitiveToRotation: true,
      worksWellWithHandwriting: true,
      strugglesWithMultiline: true,
      needsCleanBackground: true,
      performsBestAt384: true
    }
  },

  // Placeholder for future models
  // Add new models here with same structure
  texify: {
    id: 'texify',
    name: 'Texify',
    huggingFaceId: 'Norm/tex-tokenizer', // Example placeholder
    inputSize: { width: 512, height: 512 },
    maintainAspectRatio: true,
    maxInputSize: { width: 1024, height: 512 },
    grayscale: true,
    normalize: [0, 1],
    paddingColor: '#FFFFFF',
    maxTokens: 512,
    batchSize: 1,
    remoteHost: 'https://huggingface.co/',
    remotePathTemplate: '{model}/resolve/{revision}',
    preferredTileWidth: 512,
    minTileWidth: 256,
    maxTileWidth: 1024,
    tileOverlap: {
      strategy: 'percentage',
      value: 0.3,
      minOverlap: 60,
      maxOverlap: 250
    },
    restorativeMerge: {
      enabled: true,
      similarityThreshold: 0.85,
      confidenceBoost: 'longer',
      maxEditDistance: 3,
      debugVisualization: true
    },
    quirks: {
      sensitiveToRotation: false,
      worksWellWithHandwriting: true,
      strugglesWithMultiline: false,
      needsCleanBackground: true,
      performsBestAt512: true
    }
  }
};

/**
 * Get active model configuration
 * Can be extended to read from user settings/workspace preferences
 */
export function getActiveModelConfig() {
  // TODO: Read from workspace settings when implemented
  const activeModelId = 'formulanet'; // Default

  const config = OCR_MODELS[activeModelId];

  if (!config) {
    console.error(`Model "${activeModelId}" not found, falling back to formulanet`);
    return OCR_MODELS.formulanet;
  }

  return config;
}

/**
 * Set active model (for future use)
 */
export function setActiveModel(modelId) {
  if (!OCR_MODELS[modelId]) {
    throw new Error(`Unknown model: ${modelId}`);
  }

  // TODO: Persist to workspace settings
  console.log(`Active model set to: ${modelId}`);
  return OCR_MODELS[modelId];
}

/**
 * Validate if content dimensions are suitable for model
 */
export function validateContentSize(width, height, modelConfig = null) {
  const config = modelConfig || getActiveModelConfig();
  const { maxInputSize, inputSize } = config;

  const valid = width <= maxInputSize.width && height <= maxInputSize.height;
  const needsScaling = width > inputSize.width || height > inputSize.height;

  const suggestedScale = Math.min(
    maxInputSize.width / width,
    maxInputSize.height / height,
    1.0
  );

  return {
    valid,
    needsScaling,
    suggestedScale,
    recommendation: valid
      ? (needsScaling ? 'scale_down' : 'use_as_is')
      : 'split_required'
  };
}

/**
 * Calculate optimal tile configuration for given content width
 */
export function calculateTileConfig(contentWidth, modelConfig = null) {
  const config = modelConfig || getActiveModelConfig();

  if (contentWidth <= config.preferredTileWidth) {
    return {
      tileCount: 1,
      tileWidth: config.preferredTileWidth,
      overlapSize: 0,
      strategy: 'single'
    };
  }

  // Calculate overlap size
  const overlapSize = config.tileOverlap.strategy === 'percentage'
    ? Math.max(
        config.tileOverlap.minOverlap,
        Math.min(
          config.tileOverlap.maxOverlap,
          config.preferredTileWidth * config.tileOverlap.value
        )
      )
    : config.tileOverlap.value;

  // Calculate number of tiles needed
  const effectiveTileWidth = config.preferredTileWidth - overlapSize;
  const tileCount = Math.ceil((contentWidth - config.preferredTileWidth) / effectiveTileWidth) + 1;

  return {
    tileCount,
    tileWidth: config.preferredTileWidth,
    overlapSize,
    strategy: 'overlapping',
    estimatedProcessingTime: tileCount * 1.5 // seconds per tile
  };
}

/**
 * Get list of available models
 */
export function getAvailableModels() {
  return Object.values(OCR_MODELS).map(model => ({
    id: model.id,
    name: model.name,
    inputSize: model.inputSize,
    maxTileWidth: model.maxTileWidth
  }));
}

/**
 * Get model by ID
 */
export function getModelById(modelId) {
  return OCR_MODELS[modelId] || null;
}
