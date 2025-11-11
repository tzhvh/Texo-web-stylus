/**
 * Restorative LaTeX Assembly
 * Merges LaTeX fragments from overlapping tiles with verification and repair
 */

import { levenshteinDistance, similarityRatio, normalizeLatex } from './stringUtils';
import Logger from './logger';
import { getActiveModelConfig } from '../config/ocrModels';

/**
 * LaTeX Tokenizer
 * Breaks LaTeX into logical units for analysis
 */
export class LatexTokenizer {
  constructor() {
    this.commandPattern = /\\[a-zA-Z]+/;
    this.bracketPattern = /[{}]/;
    this.operatorPattern = /[+\-=*/^_]/;
  }

  /**
   * Tokenize LaTeX string into logical units
   *
   * Examples:
   *   "x^2 + 4x + 4" → ["x", "^", "2", "+", "4", "x", "+", "4"]
   *   "\frac{a}{b}" → ["\frac", "{", "a", "}", "{", "b", "}"]
   *   "\sum_{i=1}^{n}" → ["\sum", "_", "{", "i", "=", "1", "}", "^", "{", "n", "}"]
   */
  tokenize(latex) {
    if (!latex) return [];

    const tokens = [];
    let current = '';
    let inCommand = false;

    for (let i = 0; i < latex.length; i++) {
      const char = latex[i];
      const nextChar = i < latex.length - 1 ? latex[i + 1] : null;

      if (char === '\\') {
        // Start of command
        if (current && !inCommand) {
          this.pushTokenizedContent(current, tokens);
          current = '';
        }
        inCommand = true;
        current = char;
      } else if (inCommand && /[a-zA-Z]/.test(char)) {
        // Continue command
        current += char;
      } else if (char === '{' || char === '}') {
        // Brace
        if (inCommand) {
          tokens.push(current);
          current = '';
          inCommand = false;
        } else if (current) {
          this.pushTokenizedContent(current, tokens);
          current = '';
        }
        tokens.push(char);

      } else if (char === ' ') {
        // Space (separator)
        if (inCommand) {
          tokens.push(current);
          current = '';
          inCommand = false;
        } else if (current.trim()) {
          this.pushTokenizedContent(current, tokens);
          current = '';
        }
        // Skip the space itself (it's a separator)

      } else if (this.isOperator(char)) {
        // Operator
        if (inCommand) {
          tokens.push(current);
          current = '';
          inCommand = false;
        } else if (current) {
          this.pushTokenizedContent(current, tokens);
          current = '';
        }
        tokens.push(char);

      } else {
        // Regular character
        if (inCommand && !(/[a-zA-Z]/.test(char))) {
          tokens.push(current);
          current = '';
          inCommand = false;
        }

        // Check if we need to split number from letter (e.g., "4x" -> "4", "x")
        if (current.length > 0) {
          const currentIsDigit = /\d/.test(current[current.length - 1]);
          const charIsLetter = /[a-zA-Z]/.test(char);
          const charIsDigit = /\d/.test(char);
          const currentIsLetter = /[a-zA-Z]/.test(current[current.length - 1]);

          if ((currentIsDigit && charIsLetter) || (currentIsLetter && charIsDigit)) {
            // Split: push current and start new token
            this.pushTokenizedContent(current, tokens);
            current = char;
            continue;
          }
        }

        current += char;
      }
    }

    // Push remaining content
    if (current) {
      this.pushTokenizedContent(current, tokens);
    }

    return tokens.filter(t => t.length > 0);
  }

  /**
   * Push content as tokens, splitting numbers from letters if needed
   */
  pushTokenizedContent(content, tokens) {
    if (!content) return;

    // Split content into numbers and non-numbers
    const parts = content.match(/(\d+|[^\d]+)/g) || [content];

    for (const part of parts) {
      if (part.trim()) {
        tokens.push(part);
      }
    }
  }

  /**
   * Convert tokens back to LaTeX string
   */
  tokensToLatex(tokens) {
    if (!tokens || tokens.length === 0) return '';

    let result = '';
    let prevToken = null;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;

      // Add space before token if needed
      if (prevToken && this.needsSpaceBefore(token, prevToken)) {
        result += ' ';
      }

      // Add the token
      result += token;

      prevToken = token;
    }

    return result.trim();
  }

  /**
   * Determine if space is needed before token
   */
  needsSpaceBefore(token, prevToken) {
    if (!prevToken) return false;

    // No space after opening brace
    if (prevToken === '{') return false;

    // No space before closing brace
    if (token === '}') return false;

    // No space before opening brace (except after commands)
    if (token === '{' && !prevToken.startsWith('\\')) return false;

    // No space after ^ or _
    if (prevToken === '^' || prevToken === '_') return false;

    // No space before ^ or _
    if (token === '^' || token === '_') return false;

    // Space before operators (except ^ and _)
    if (this.isOperator(token) && token !== '^' && token !== '_') {
      return true;
    }

    // Space after operators (except ^ and _)
    if (this.isOperator(prevToken) && prevToken !== '^' && prevToken !== '_') {
      return true;
    }

    // Space after commands (unless followed by brace)
    if (prevToken.startsWith('\\') && token !== '{' && token !== '}') {
      return true;
    }

    // Space before commands
    if (token.startsWith('\\')) {
      return true;
    }

    return false;
  }

  isOperator(char) {
    return /[+\-=*/^_]/.test(char);
  }

  /**
   * Estimate which tokens correspond to a spatial region
   * Used for extracting overlap segments
   */
  estimateTokensInRange(tokens, startRatio, endRatio) {
    if (!tokens || tokens.length === 0) return [];

    const startIndex = Math.floor(tokens.length * startRatio);
    const endIndex = Math.ceil(tokens.length * endRatio);

    return tokens.slice(startIndex, endIndex);
  }
}

/**
 * Restorative LaTeX Assembler
 * Merges tiles with overlap verification and repair
 */
export class RestorativeLatexAssembler {
  constructor(modelConfig = null) {
    this.config = modelConfig || getActiveModelConfig();
    this.tokenizer = new LatexTokenizer();
  }

  /**
   * Assemble tiles with restorative merging
   *
   * @param {Array} tiles - Tiles with OCR results
   * @returns {Object} { latex, confidence, repairs, tileCount }
   */
  assembleTiles(tiles) {
    if (!tiles || tiles.length === 0) {
      return { latex: '', confidence: 0, repairs: [], tileCount: 0 };
    }

    if (tiles.length === 1) {
      return {
        latex: this.cleanLatex(tiles[0].latex || ''),
        confidence: 1.0,
        repairs: [],
        tileCount: 1
      };
    }

    Logger.debug('LatexAssembly', `Assembling ${tiles.length} tiles`);

    // Sort tiles by position
    const sorted = [...tiles].sort((a, b) => a.offsetX - b.offsetX);

    // Extract overlap segments for each tile
    this.extractOverlapSegments(sorted);

    // Merge with verification
    const result = this.mergeWithVerification(sorted);

    Logger.info('LatexAssembly', `Assembly complete: confidence=${result.confidence.toFixed(2)}`, {
      repairs: result.repairs.length,
      latex: result.latex.substring(0, 100)
    });

    return result;
  }

  /**
   * Extract LaTeX segments that correspond to overlap regions
   */
  extractOverlapSegments(tiles) {
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];

      if (!tile.latex) continue;

      // Tokenize the tile's LaTeX
      const tokens = this.tokenizer.tokenize(tile.latex);

      Logger.debug('LatexAssembly', `Tile ${i} tokens (${tokens.length}):`, tokens);

      if (tile.rightOverlap && i < tiles.length - 1) {
        // Estimate right overlap segment
        const overlapRatio = tile.rightOverlap.size / tile.logicalWidth;
        const startRatio = 1 - overlapRatio;

        const rightTokens = this.tokenizer.estimateTokensInRange(tokens, startRatio, 1.0);
        tile.rightOverlapLatex = this.tokenizer.tokensToLatex(rightTokens);

        Logger.debug('LatexAssembly', `Tile ${i} right overlap (${overlapRatio.toFixed(2)}):`, {
          latex: tile.rightOverlapLatex,
          tokens: rightTokens.length
        });
      }

      if (tile.leftOverlap && i > 0) {
        // Estimate left overlap segment
        const overlapRatio = tile.leftOverlap.size / tile.logicalWidth;

        const leftTokens = this.tokenizer.estimateTokensInRange(tokens, 0, overlapRatio);
        tile.leftOverlapLatex = this.tokenizer.tokensToLatex(leftTokens);

        Logger.debug('LatexAssembly', `Tile ${i} left overlap (${overlapRatio.toFixed(2)}):`, {
          latex: tile.leftOverlapLatex,
          tokens: leftTokens.length
        });
      }
    }
  }

  /**
   * Merge tiles with overlap verification and repair
   */
  mergeWithVerification(tiles) {
    let merged = tiles[0].latex || '';
    const repairs = [];
    let totalConfidence = 1.0;

    for (let i = 1; i < tiles.length; i++) {
      const prevTile = tiles[i - 1];
      const currTile = tiles[i];

      // Get overlap segments
      const leftSegment = prevTile.rightOverlapLatex || '';
      const rightSegment = currTile.leftOverlapLatex || '';

      Logger.debug('LatexAssembly', `Comparing overlap ${i - 1}↔${i}:`, {
        left: leftSegment,
        right: rightSegment
      });

      // Compare overlap segments
      const comparison = this.compareOverlaps(leftSegment, rightSegment);

      if (comparison.identical) {
        // Perfect match - high confidence merge
        Logger.info('LatexAssembly', `Tiles ${i - 1}↔${i}: Identical overlap ✓`);

        // Remove overlap from current tile
        const nonOverlapPart = this.removeOverlapPrefix(
          currTile.latex,
          rightSegment
        );
        merged += ' ' + nonOverlapPart;

      } else if (comparison.similar) {
        // Similar but not identical - repair
        Logger.warn('LatexAssembly', `Tiles ${i - 1}↔${i}: Similar overlap (${comparison.similarity.toFixed(2)}) ~`);

        const repaired = this.repairOverlap(
          leftSegment,
          rightSegment,
          comparison
        );

        repairs.push({
          position: i,
          type: 'similarity',
          original: [leftSegment, rightSegment],
          repaired: repaired.latex,
          confidence: repaired.confidence,
          editDistance: comparison.editDistance
        });

        // Use repaired version and continue with non-overlap part
        const nonOverlapPart = this.removeOverlapPrefix(
          currTile.latex,
          rightSegment
        );

        // Replace ending of merged with repaired version
        merged = this.replaceOverlapSuffix(merged, leftSegment, repaired.latex);
        merged += ' ' + nonOverlapPart;

        totalConfidence *= repaired.confidence;

      } else {
        // Different - potential OCR error
        Logger.error('LatexAssembly', `Tiles ${i - 1}↔${i}: Different overlaps! ✗`, {
          left: leftSegment,
          right: rightSegment,
          distance: comparison.editDistance,
          similarity: comparison.similarity.toFixed(2)
        });

        repairs.push({
          position: i,
          type: 'mismatch',
          original: [leftSegment, rightSegment],
          action: 'kept_left',
          confidence: 0.5,
          editDistance: comparison.editDistance
        });

        // Conservative: trust earlier tile
        const nonOverlapPart = this.removeOverlapPrefix(
          currTile.latex,
          rightSegment
        );
        merged += ' ' + nonOverlapPart;

        totalConfidence *= 0.5;
      }
    }

    // Final cleanup
    merged = this.cleanLatex(merged);

    // Calculate geometric mean confidence
    const avgConfidence = tiles.length > 1
      ? Math.pow(totalConfidence, 1 / (tiles.length - 1))
      : totalConfidence;

    return {
      latex: merged,
      confidence: avgConfidence,
      repairs,
      tileCount: tiles.length
    };
  }

  /**
   * Compare two overlap segments
   */
  compareOverlaps(left, right) {
    if (!left || !right) {
      return {
        identical: false,
        similar: false,
        similarity: 0,
        editDistance: Infinity
      };
    }

    // Normalize whitespace for identity check
    const leftNorm = normalizeLatex(left);
    const rightNorm = normalizeLatex(right);

    // Check identity
    if (leftNorm === rightNorm) {
      return {
        identical: true,
        similar: true,
        similarity: 1.0,
        editDistance: 0
      };
    }

    // Calculate similarity on original strings (with spaces) for better accuracy
    const similarity = similarityRatio(left.trim(), right.trim());
    const distance = levenshteinDistance(leftNorm, rightNorm);

    // Also check for common content (token overlap)
    const leftTokens = this.tokenizer.tokenize(left);
    const rightTokens = this.tokenizer.tokenize(right);
    const commonTokens = leftTokens.filter(t => rightTokens.includes(t));
    const tokenOverlap = commonTokens.length / Math.max(leftTokens.length, rightTokens.length);

    // Consider similar if either:
    // 1. String similarity is above threshold (0.85)
    // 2. Token overlap is high (>50%) - indicates mostly shared tokens
    // 3. Token overlap is moderate (>40%) AND string similarity is good (>0.7)
    // This handles imperfect token extraction while avoiding false positives
    const threshold = this.config.restorativeMerge.similarityThreshold;
    const similar = similarity >= threshold ||
                    tokenOverlap > 0.5 ||
                    (tokenOverlap > 0.4 && similarity > 0.7);

    // Adjust similarity to account for token overlap (but not too much)
    const adjustedSimilarity = Math.max(similarity, tokenOverlap * 0.88);

    return {
      identical: false,
      similar,
      similarity: adjustedSimilarity,
      editDistance: distance,
      tokenOverlap
    };
  }

  /**
   * Repair overlap using configured strategy
   */
  repairOverlap(left, right, comparison) {
    const strategy = this.config.restorativeMerge.confidenceBoost;

    let repaired;
    let confidence;

    switch (strategy) {
      case 'longer':
        // Assume longer version captured more detail
        repaired = left.length > right.length ? left : right;
        confidence = 0.85 + (comparison.similarity * 0.1);
        Logger.debug('LatexAssembly', 'Repair strategy: longer', { repaired });
        break;

      case 'shorter':
        // Assume shorter version is cleaner
        repaired = left.length < right.length ? left : right;
        confidence = 0.80 + (comparison.similarity * 0.1);
        Logger.debug('LatexAssembly', 'Repair strategy: shorter', { repaired });
        break;

      case 'average':
        // Try to merge both (use longer for now, could be smarter)
        repaired = this.mergeSimilarStrings(left, right, comparison);
        confidence = 0.75 + (comparison.similarity * 0.15);
        Logger.debug('LatexAssembly', 'Repair strategy: average', { repaired });
        break;

      default:
        // Default to left (earlier tile)
        repaired = left;
        confidence = 0.70 + (comparison.similarity * 0.1);
        Logger.debug('LatexAssembly', 'Repair strategy: default (left)', { repaired });
    }

    return { latex: repaired, confidence };
  }

  /**
   * Merge similar strings by choosing best parts
   */
  mergeSimilarStrings(str1, str2, comparison) {
    // For now, use longer string
    // TODO: Could implement character-by-character alignment
    return str1.length >= str2.length ? str1 : str2;
  }

  /**
   * Remove overlap prefix from LaTeX string
   */
  removeOverlapPrefix(latex, overlapSegment) {
    if (!latex || !overlapSegment) return latex;

    // Tokenize both
    const latexTokens = this.tokenizer.tokenize(latex);
    const overlapTokens = this.tokenizer.tokenize(overlapSegment);

    // Remove overlap tokens from beginning
    const remainingTokens = latexTokens.slice(overlapTokens.length);

    return this.tokenizer.tokensToLatex(remainingTokens);
  }

  /**
   * Replace overlap suffix in merged string
   */
  replaceOverlapSuffix(merged, oldOverlap, newOverlap) {
    if (!oldOverlap || !newOverlap) return merged;

    // Tokenize
    const mergedTokens = this.tokenizer.tokenize(merged);
    const oldTokens = this.tokenizer.tokenize(oldOverlap);
    const newTokens = this.tokenizer.tokenize(newOverlap);

    // Replace last N tokens with new tokens
    const updatedTokens = [
      ...mergedTokens.slice(0, -oldTokens.length),
      ...newTokens
    ];

    return this.tokenizer.tokensToLatex(updatedTokens);
  }

  /**
   * Clean and normalize LaTeX
   */
  cleanLatex(latex) {
    if (!latex) return '';

    let cleaned = latex;

    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Fix common OCR errors
    cleaned = cleaned.replace(/\\times\s*\\times/g, '\\times');
    cleaned = cleaned.replace(/\+\s*\+/g, '+');
    cleaned = cleaned.replace(/-\s*-/g, '+');
    cleaned = cleaned.replace(/=\s*=/g, '=');

    // Normalize spacing around operators
    cleaned = cleaned.replace(/\s*([+\-=])\s*/g, ' $1 ');
    cleaned = cleaned.replace(/\s+/g, ' ');

    // Fix brace spacing
    cleaned = cleaned.replace(/{\s+/g, '{');
    cleaned = cleaned.replace(/\s+}/g, '}');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }
}

/**
 * Convenience function for single-shot assembly
 */
export function assembleLatexTiles(tiles) {
  const assembler = new RestorativeLatexAssembler();
  return assembler.assembleTiles(tiles);
}
