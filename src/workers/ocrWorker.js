/**
 * OCR Web Worker
 * Handles model loading and inference using Hugging Face Transformers.js
 */

import {
  PreTrainedTokenizer,
  VisionEncoderDecoderModel,
  env,
  cat,
  Tensor
} from '@huggingface/transformers'
import { preprocessImg } from './imageProcessor.js'

// Configure environment
env.allowLocalModels = false
env.backends.onnx.wasm.proxy = true

let model, tokenizer, isInitialized = false

/**
 * Initialize the OCR model and tokenizer
 * @param {Object} modelConfig - Configuration object with modelName and env_config
 */
async function init(modelConfig) {
  if (isInitialized) return

  try {
    // Configure remote environment if provided
    if (modelConfig.env_config) {
      env.remoteHost = modelConfig.env_config.remoteHost
      env.remotePathTemplate = modelConfig.env_config.remotePathTemplate
    }

    // Load model with progress callback
    model = await VisionEncoderDecoderModel.from_pretrained(modelConfig.modelName, {
      dtype: 'fp32',
      progress_callback: (data) => {
        self.postMessage({
          type: 'progress',
          file: data.file,
          loaded: data.loaded,
          total: data.total,
          status: data.status
        })
      }
    })

    // Load tokenizer
    tokenizer = await PreTrainedTokenizer.from_pretrained(modelConfig.modelName)

    isInitialized = true
    self.postMessage({ type: 'ready' })
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      stack: error.stack
    })
  }
}

/**
 * Perform OCR prediction on an image
 * @param {File|Blob} imageFile - The image to process
 * @returns {Promise<string>} - The recognized LaTeX text
 */
async function predict(imageFile) {
  const startTime = performance.now()

  // Preprocess image
  const { array } = await preprocessImg(imageFile)

  // Create tensor and prepare input
  const tensor = new Tensor('float32', array, [1, 1, 384, 384])
  const pixel_values = cat([tensor, tensor, tensor], 1)

  // Generate output
  const outputs = await model.generate({
    inputs: pixel_values,
    max_length: 512
  })

  // Decode text
  const text = tokenizer.batch_decode(outputs, {
    skip_special_tokens: true
  })[0]

  const endTime = performance.now()
  const processingTime = ((endTime - startTime) / 1000).toFixed(2)

  return { text, time: processingTime }
}

/**
 * Handle messages from the main thread
 */
self.onmessage = async (e) => {
  const { action, modelConfig, image, key } = e.data

  if (action === 'init') {
    await init(modelConfig)
  } else if (action === 'predict') {
    try {
      const { text, time } = await predict(image)
      self.postMessage({
        type: 'result',
        output: text,
        time: time,
        key
      })
    } catch (err) {
      self.postMessage({
        type: 'error',
        error: err.message,
        stack: err.stack,
        key
      })
    }
  }
}
