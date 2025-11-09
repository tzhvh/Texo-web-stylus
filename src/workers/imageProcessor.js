/**
 * Image preprocessing utility for OCR
 * Handles image loading, resizing, normalization, and tensor conversion
 */

import { Image } from 'image-js'

/**
 * Preprocesses an image file for the OCR model
 * @param {File|Blob} imageFile - The image file to process
 * @param {number} targetSize - Target size for the square image (default: 384)
 * @returns {Promise<{array: Float32Array, width: number, height: number}>}
 */
export async function preprocessImg(imageFile, targetSize = 384) {
  // Read the image file
  const arrayBuffer = await imageFile.arrayBuffer()
  const img = await Image.load(arrayBuffer)

  // Convert to grayscale if needed
  let grayscale = img.grey()

  // Get original dimensions
  const { width, height } = grayscale

  // Resize to target size while maintaining aspect ratio
  // Then pad to square
  const maxDim = Math.max(width, height)
  const scale = targetSize / maxDim

  const newWidth = Math.round(width * scale)
  const newHeight = Math.round(height * scale)

  // Resize image
  let resized = grayscale.resize({
    width: newWidth,
    height: newHeight
  })

  // Create square canvas with padding
  const padX = Math.floor((targetSize - newWidth) / 2)
  const padY = Math.floor((targetSize - newHeight) / 2)

  // Create a white background image
  const padded = new Image(targetSize, targetSize, {
    kind: 'GREY',
    data: new Uint8Array(targetSize * targetSize).fill(255)
  })

  // Copy resized image to center
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const srcIdx = y * newWidth + x
      const dstIdx = (y + padY) * targetSize + (x + padX)
      padded.data[dstIdx] = resized.data[srcIdx]
    }
  }

  // Normalize to [0, 1] range
  const normalized = new Float32Array(targetSize * targetSize)
  for (let i = 0; i < padded.data.length; i++) {
    normalized[i] = padded.data[i] / 255.0
  }

  return {
    array: normalized,
    width: targetSize,
    height: targetSize
  }
}
