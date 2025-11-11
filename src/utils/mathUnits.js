/**
 * Mathematical Unit Detection
 * Defensive detection to prevent catastrophic OCR mis-parsing
 * Only flags obvious structural elements with high confidence
 */

import RBush from 'rbush';

export class MathUnitDetector {
  constructor() {
    this.patterns = [
      { type: 'fraction', detector: this.detectFraction.bind(this), priority: 'high' },
      { type: 'radical', detector: this.detectRadical.bind(this), priority: 'high' },
      { type: 'integral', detector: this.detectIntegral.bind(this), priority: 'high' },
      { type: 'summation', detector: this.detectSummation.bind(this), priority: 'medium' },
      { type: 'exponent', detector: this.detectExponent.bind(this), priority: 'high' },
      { type: 'subscript', detector: this.detectSubscript.bind(this), priority: 'medium' }
    ];

    this.confidenceThreshold = 0.7; // Only flag units with >70% confidence
  }

  /**
   * Find mathematical units in elements
   * Conservative approach - only detect obvious structural elements
   *
   * @param {Array} elements - Excalidraw elements
   * @returns {Array} Detected units with bounds and confidence
   */
  findUnits(elements) {
    const units = [];
    const spatialIndex = this.buildSpatialIndex(elements);

    // Only detect high-priority patterns (catastrophic if split)
    for (const pattern of this.patterns) {
      if (pattern.priority === 'high') {
        const detected = pattern.detector(elements, spatialIndex);
        // Only include high-confidence detections
        units.push(...detected.filter(u => u.confidence >= this.confidenceThreshold));
      }
    }

    return this.mergeOverlapping(units);
  }

  /**
   * Detect fractions - CONSERVATIVE
   * Only flag clear horizontal lines with content above AND below
   */
  detectFraction(elements, spatialIndex) {
    const fractions = [];

    // Find horizontal lines
    const horizontalLines = elements.filter(el =>
      el.type === 'line' &&
      Math.abs(el.angle || 0) < 0.15 && // Nearly horizontal (some tolerance)
      el.width > 30 // Reasonably long
    );

    for (const line of horizontalLines) {
      // Search for content above line
      const above = spatialIndex.search({
        minX: line.x - 10,
        minY: line.y - 60,
        maxX: line.x + line.width + 10,
        maxY: line.y - 5
      });

      // Search for content below line
      const below = spatialIndex.search({
        minX: line.x - 10,
        minY: line.y + 5,
        maxX: line.x + line.width + 10,
        maxY: line.y + 60
      });

      // Require content both above and below (at least 1 each)
      if (above.length >= 1 && below.length >= 1) {
        const allElements = [
          line,
          ...above.map(r => r.element),
          ...below.map(r => r.element)
        ];
        const bounds = this.getBounds(allElements);

        const confidence = this.calculateFractionConfidence(line, above, below);

        if (confidence >= this.confidenceThreshold) {
          fractions.push({
            type: 'fraction',
            elements: allElements,
            bounds,
            critical: true,
            confidence,
            metadata: {
              lineLength: line.width,
              numeratorCount: above.length,
              denominatorCount: below.length
            }
          });
        }
      }
    }

    return fractions;
  }

  /**
   * Calculate fraction confidence based on alignment and symmetry
   */
  calculateFractionConfidence(line, above, below) {
    const lineCenter = line.x + line.width / 2;

    const aboveBounds = this.getBounds(above.map(r => r.element));
    const belowBounds = this.getBounds(below.map(r => r.element));

    if (!aboveBounds || !belowBounds) return 0;

    const aboveCenter = aboveBounds.minX + (aboveBounds.maxX - aboveBounds.minX) / 2;
    const belowCenter = belowBounds.minX + (belowBounds.maxX - belowBounds.minX) / 2;

    // Check alignment: how centered are numerator and denominator?
    const alignmentScore = 1 - Math.abs(lineCenter - (aboveCenter + belowCenter) / 2) / line.width;

    // Check if content widths are reasonable (not too mismatched)
    const aboveWidth = aboveBounds.maxX - aboveBounds.minX;
    const belowWidth = belowBounds.maxX - belowBounds.minX;
    const widthRatio = Math.min(aboveWidth, belowWidth) / Math.max(aboveWidth, belowWidth);

    // Weighted average
    const confidence = alignmentScore * 0.6 + widthRatio * 0.4;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Detect radicals - CONSERVATIVE
   * Only flag clear √ shapes with content to the right
   */
  detectRadical(elements, spatialIndex) {
    const radicals = [];

    const candidates = elements.filter(el => {
      if (el.type === 'freedraw' && el.points && el.points.length > 5) {
        const radicalScore = this.looksLikeRadical(el.points);
        return radicalScore > this.confidenceThreshold;
      }
      return false;
    });

    for (const radical of candidates) {
      // Find content to the right and slightly above
      const content = spatialIndex.search({
        minX: radical.x + radical.width * 0.5,
        minY: radical.y - 15,
        maxX: radical.x + radical.width + 120,
        maxY: radical.y + radical.height + 5
      });

      if (content.length >= 1) {
        const allElements = [radical, ...content.map(r => r.element)];
        const bounds = this.getBounds(allElements);

        radicals.push({
          type: 'radical',
          elements: allElements,
          bounds,
          critical: true,
          confidence: 0.8,
          metadata: {
            contentCount: content.length
          }
        });
      }
    }

    return radicals;
  }

  /**
   * Analyze stroke to detect √ shape
   * Returns confidence score (0-1)
   */
  looksLikeRadical(points) {
    if (!points || points.length < 5) return 0;

    // Analyze stroke path: should go down then up (V shape with hook)
    const firstHalf = points.slice(0, Math.floor(points.length / 2));
    const secondHalf = points.slice(Math.floor(points.length / 2));

    // Calculate vertical trends
    const firstTrend = firstHalf[firstHalf.length - 1][1] - firstHalf[0][1];
    const secondTrend = secondHalf[secondHalf.length - 1][1] - secondHalf[0][1];

    // Should go down (positive Y) then up (negative Y)
    if (firstTrend > 5 && secondTrend < -5) {
      // Check aspect ratio: should be taller than wide
      const minY = Math.min(...points.map(p => p[1]));
      const maxY = Math.max(...points.map(p => p[1]));
      const minX = Math.min(...points.map(p => p[0]));
      const maxX = Math.max(...points.map(p => p[0]));

      const height = maxY - minY;
      const width = maxX - minX;

      if (height > width * 1.2) {
        return 0.85;
      }
      return 0.75;
    }

    return 0;
  }

  /**
   * Detect integrals - CONSERVATIVE
   * Look for ∫ symbol with bounds and integrand
   */
  detectIntegral(elements, spatialIndex) {
    const integrals = [];

    // Look for tall, curved, narrow symbols
    const candidates = elements.filter(el => {
      if (!el.width || !el.height) return false;
      const aspectRatio = el.height / el.width;
      return aspectRatio > 3 && el.height > 50 && el.width < 30;
    });

    for (const symbol of candidates) {
      // Find upper bound (above)
      const above = spatialIndex.search({
        minX: symbol.x - 15,
        minY: symbol.y - 30,
        maxX: symbol.x + symbol.width + 15,
        maxY: symbol.y
      });

      // Find lower bound (below)
      const below = spatialIndex.search({
        minX: symbol.x - 15,
        minY: symbol.y + symbol.height,
        maxX: symbol.x + symbol.width + 15,
        maxY: symbol.y + symbol.height + 30
      });

      // Find integrand (to the right)
      const right = spatialIndex.search({
        minX: symbol.x + symbol.width,
        minY: symbol.y,
        maxX: symbol.x + symbol.width + 150,
        maxY: symbol.y + symbol.height
      });

      // Require integrand at minimum
      if (right.length >= 1) {
        const allElements = [
          symbol,
          ...above.map(r => r.element),
          ...below.map(r => r.element),
          ...right.map(r => r.element)
        ];
        const bounds = this.getBounds(allElements);

        integrals.push({
          type: 'integral',
          elements: allElements,
          bounds,
          critical: true,
          confidence: 0.75,
          metadata: {
            hasBounds: above.length > 0 || below.length > 0,
            integrandCount: right.length
          }
        });
      }
    }

    return integrals;
  }

  /**
   * Detect summations - SIMILAR to integrals but wider
   */
  detectSummation(elements, spatialIndex) {
    const summations = [];

    // Look for Σ shape: wider than integral, shorter aspect ratio
    const candidates = elements.filter(el => {
      if (!el.width || !el.height) return false;
      const aspectRatio = el.height / el.width;
      return aspectRatio > 1.5 && aspectRatio < 3 && el.height > 40;
    });

    for (const symbol of candidates) {
      const above = spatialIndex.search({
        minX: symbol.x - 10,
        minY: symbol.y - 30,
        maxX: symbol.x + symbol.width + 10,
        maxY: symbol.y
      });

      const below = spatialIndex.search({
        minX: symbol.x - 10,
        minY: symbol.y + symbol.height,
        maxX: symbol.x + symbol.width + 10,
        maxY: symbol.y + symbol.height + 30
      });

      const right = spatialIndex.search({
        minX: symbol.x + symbol.width,
        minY: symbol.y,
        maxX: symbol.x + symbol.width + 120,
        maxY: symbol.y + symbol.height
      });

      if (right.length >= 1) {
        const allElements = [
          symbol,
          ...above.map(r => r.element),
          ...below.map(r => r.element),
          ...right.map(r => r.element)
        ];
        const bounds = this.getBounds(allElements);

        summations.push({
          type: 'summation',
          elements: allElements,
          bounds,
          critical: true,
          confidence: 0.70,
          metadata: {
            hasBounds: above.length > 0 || below.length > 0,
            termCount: right.length
          }
        });
      }
    }

    return summations;
  }

  /**
   * Detect exponents - HIGH PRIORITY
   * Look for small content above and to the right of base element
   */
  detectExponent(elements, spatialIndex) {
    const exponents = [];

    // Group elements by approximate baseline
    const grouped = this.groupByBaseline(elements);

    for (const group of grouped) {
      for (const base of group) {
        if (!base.width || !base.height) continue;

        // Look for small content in superscript position
        const candidates = spatialIndex.search({
          minX: base.x + base.width * 0.5,        // Start halfway through base
          minY: base.y - base.height * 0.7,        // Above base
          maxX: base.x + base.width + 40,          // Extend to the right
          maxY: base.y + base.height * 0.3         // Slight overlap
        });

        // Filter for significantly smaller elements
        const superscripts = candidates.filter(r => {
          const el = r.element;
          if (!el.height) return false;

          // Must be smaller than base
          const heightRatio = el.height / base.height;

          // Must be positioned higher than base
          const isAbove = el.y < base.y + base.height * 0.3;

          return heightRatio < 0.6 && heightRatio > 0.2 && isAbove;
        });

        if (superscripts.length > 0) {
          const allElements = [base, ...superscripts.map(r => r.element)];
          const bounds = this.getBounds(allElements);

          // Calculate confidence based on size ratio and position
          const avgHeightRatio = superscripts.reduce((sum, s) =>
            sum + (s.element.height / base.height), 0) / superscripts.length;

          const sizeScore = 1 - Math.abs(avgHeightRatio - 0.4); // Ideal is ~40% of base
          const confidence = Math.max(0.7, Math.min(0.95, sizeScore));

          exponents.push({
            type: 'exponent',
            elements: allElements,
            bounds,
            critical: true, // Critical: x^2 should not be split as "x^" and "2"
            confidence,
            metadata: {
              base: { x: base.x, y: base.y, width: base.width, height: base.height },
              exponentCount: superscripts.length,
              heightRatio: avgHeightRatio
            }
          });
        }
      }
    }

    return exponents;
  }

  /**
   * Detect subscripts - similar to exponents but below
   */
  detectSubscript(elements, spatialIndex) {
    const subscripts = [];

    const grouped = this.groupByBaseline(elements);

    for (const group of grouped) {
      for (const base of group) {
        if (!base.width || !base.height) continue;

        // Look for small content in subscript position
        const candidates = spatialIndex.search({
          minX: base.x + base.width * 0.5,
          minY: base.y + base.height * 0.6,        // Below base
          maxX: base.x + base.width + 40,
          maxY: base.y + base.height + 25
        });

        const subscriptElements = candidates.filter(r => {
          const el = r.element;
          if (!el.height) return false;

          const heightRatio = el.height / base.height;
          const isBelow = el.y > base.y + base.height * 0.6;

          return heightRatio < 0.6 && heightRatio > 0.2 && isBelow;
        });

        if (subscriptElements.length > 0) {
          const allElements = [base, ...subscriptElements.map(r => r.element)];
          const bounds = this.getBounds(allElements);

          const avgHeightRatio = subscriptElements.reduce((sum, s) =>
            sum + (s.element.height / base.height), 0) / subscriptElements.length;

          const sizeScore = 1 - Math.abs(avgHeightRatio - 0.4);
          const confidence = Math.max(0.65, Math.min(0.9, sizeScore));

          subscripts.push({
            type: 'subscript',
            elements: allElements,
            bounds,
            critical: false, // Less critical than exponents
            confidence,
            metadata: {
              base: { x: base.x, y: base.y, width: base.width, height: base.height },
              subscriptCount: subscriptElements.length,
              heightRatio: avgHeightRatio
            }
          });
        }
      }
    }

    return subscripts;
  }

  // Helper methods

  /**
   * Build spatial index for fast queries
   */
  buildSpatialIndex(elements) {
    const tree = new RBush();
    elements.forEach(el => {
      if (el.type === 'line' && el.isRowDivider) return; // Skip row dividers

      tree.insert({
        minX: el.x || 0,
        minY: el.y || 0,
        maxX: (el.x || 0) + (el.width || 0),
        maxY: (el.y || 0) + (el.height || 0),
        element: el
      });
    });
    return tree;
  }

  /**
   * Get bounding box for elements
   */
  getBounds(elements) {
    if (elements.length === 0) return null;

    const bounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };

    elements.forEach(el => {
      bounds.minX = Math.min(bounds.minX, el.x || 0);
      bounds.minY = Math.min(bounds.minY, el.y || 0);
      bounds.maxX = Math.max(bounds.maxX, (el.x || 0) + (el.width || 0));
      bounds.maxY = Math.max(bounds.maxY, (el.y || 0) + (el.height || 0));
    });

    return bounds;
  }

  /**
   * Group elements by approximate baseline (Y position)
   * Used for exponent/subscript detection
   */
  groupByBaseline(elements) {
    const BASELINE_THRESHOLD = 20; // Elements within 20px Y are considered same baseline

    const groups = [];
    const sorted = [...elements]
      .filter(el => el.type !== 'line' || !el.isRowDivider)
      .sort((a, b) => (a.y || 0) - (b.y || 0));

    let currentGroup = [];
    let currentBaseline = null;

    for (const el of sorted) {
      const elY = el.y || 0;

      if (currentBaseline === null || Math.abs(elY - currentBaseline) <= BASELINE_THRESHOLD) {
        currentGroup.push(el);
        currentBaseline = elY;
      } else {
        if (currentGroup.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = [el];
        currentBaseline = elY;
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  /**
   * Merge overlapping units
   */
  mergeOverlapping(units) {
    if (units.length === 0) return [];

    // Sort by x position
    const sorted = [...units].sort((a, b) => a.bounds.minX - b.bounds.minX);

    const merged = [];
    let current = null;

    for (const unit of sorted) {
      if (!current) {
        current = unit;
        continue;
      }

      // Check for overlap
      const overlapAmount = this.calculateOverlap(current.bounds, unit.bounds);

      if (overlapAmount > 0.3) { // 30% overlap threshold
        // Merge units
        const allElements = [...new Set([...current.elements, ...unit.elements])];
        current = {
          type: 'composite',
          elements: allElements,
          bounds: this.getBounds(allElements),
          critical: current.critical || unit.critical,
          confidence: Math.max(current.confidence, unit.confidence),
          metadata: {
            mergedTypes: [current.type, unit.type],
            components: [current.metadata, unit.metadata]
          }
        };
      } else {
        merged.push(current);
        current = unit;
      }
    }

    if (current) merged.push(current);

    return merged;
  }

  /**
   * Calculate overlap ratio between two bounding boxes
   */
  calculateOverlap(bounds1, bounds2) {
    const xOverlap = Math.max(0,
      Math.min(bounds1.maxX, bounds2.maxX) - Math.max(bounds1.minX, bounds2.minX)
    );
    const yOverlap = Math.max(0,
      Math.min(bounds1.maxY, bounds2.maxY) - Math.max(bounds1.minY, bounds2.minY)
    );

    const overlapArea = xOverlap * yOverlap;
    const area1 = (bounds1.maxX - bounds1.minX) * (bounds1.maxY - bounds1.minY);
    const area2 = (bounds2.maxX - bounds2.minX) * (bounds2.maxY - bounds2.minY);

    const minArea = Math.min(area1, area2);
    return minArea > 0 ? overlapArea / minArea : 0;
  }
}
