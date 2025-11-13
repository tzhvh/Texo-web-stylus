import { useCallback, useMemo, useRef, useState } from 'react';

/**
 * Safely integrates Excalidraw with safeguards against infinite loops
 * 
 * @param {Object} config - Configuration object
 * @param {boolean} config.debugMode - Enable debug logging
 * @param {Function} config.onStateChange - Optional state change handler
 * @returns {Object} Safe Excalidraw integration helpers
 */
export function useSafeExcalidraw(config = {}) {
  const { debugMode = false, onStateChange } = config;
  
  // Safeguard refs
  const renderCountRef = useRef(0);
  const lastOnChangeTimeRef = useRef(0);
  const updateCountRef = useRef(0);
  
  // Track render count
  if (debugMode) {
    renderCountRef.current += 1;
    if (renderCountRef.current > 100) {
      console.warn(
        `useSafeExcalidraw: High render count detected (${renderCountRef.current}) - potential infinite loop`
      );
    }
  }

  // State with functional updates
  const [state, setState] = useState({
    elementCount: 0,
    zoomLevel: 1,
    scrollX: 0,
    scrollY: 0,
  });

  // Safe onChange handler with throttling detection
  const handleChange = useCallback((elements, appState, files) => {
    const now = Date.now();
    updateCountRef.current += 1;
    
    // Throttling detection
    if (debugMode) {
      const timeSinceLastCall = now - lastOnChangeTimeRef.current;
      if (timeSinceLastCall < 16) {
        console.warn(
          `useSafeExcalidraw: onChange called too frequently (${timeSinceLastCall}ms). ` +
          `Update #${updateCountRef.current}`
        );
      }
      lastOnChangeTimeRef.current = now;
    }

    // Use functional updates to avoid stale closures
    setState(prevState => {
      const newState = {
        elementCount: elements.filter(el => !el.id?.startsWith('guide-') && !el.isDeleted).length,
        zoomLevel: appState.zoom?.value || 1,
        scrollX: appState.scrollX || 0,
        scrollY: appState.scrollY || 0,
      };
      
      // Optional external handler
      if (onStateChange) {
        onStateChange(newState, elements, appState, files);
      }
      
      return newState;
    });
  }, [debugMode, onStateChange]);

  // Memoize initial data
  const createInitialData = useCallback((appStateOverrides = {}) => {
    return useMemo(() => ({
      appState: {
        viewBackgroundColor: '#f5f5f5',
        currentItemStrokeColor: '#000000',
        currentItemBackgroundColor: 'transparent',
        currentItemFillStyle: 'solid',
        currentItemStrokeWidth: 2,
        currentItemRoughness: 0,
        currentItemOpacity: 100,
        zoom: { value: 1 },
        scrollX: 0,
        scrollY: 0,
        ...appStateOverrides,
      },
      elements: [],
      scrollToContent: false,
    }), [appStateOverrides]);
  }, []);

  // Safe scene update
  const updateScene = useCallback((api, elements) => {
    if (!api) {
      if (debugMode) {
        console.warn('useSafeExcalidraw: Attempted to update scene with null API');
      }
      return;
    }
    
    try {
      api.updateScene({ elements });
    } catch (error) {
      console.error('useSafeExcalidraw: Scene update failed:', error);
    }
  }, [debugMode]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debugMode) {
      console.log(
        `useSafeExcalidraw cleanup: ${renderCountRef.current} renders, ` +
        `${updateCountRef.current} updates`
      );
    }
    renderCountRef.current = 0;
    updateCountRef.current = 0;
    lastOnChangeTimeRef.current = 0;
  }, [debugMode]);

  return {
    state,
    handleChange,
    createInitialData,
    updateScene,
    cleanup,
    debugInfo: debugMode ? {
      renderCount: renderCountRef.current,
      updateCount: updateCountRef.current,
      lastUpdateTime: lastOnChangeTimeRef.current,
    } : null,
  };
}

/**
 * Wraps a component with infinite loop protection
 */
export function withLoopProtection(WrappedComponent, options = {}) {
  const { maxRenders = 100, name = 'Component' } = options;
  
  return React.memo(function ProtectedComponent(props) {
    const renderCount = useRef(0);
    
    renderCount.current += 1;
    
    if (renderCount.current > maxRenders) {
      console.error(
        `${name}: Stopping renders after ${maxRenders} - infinite loop detected`
      );
      return <div>Error: Infinite loop detected in {name}</div>;
    }
    
    return <WrappedComponent {...props} />;
  });
}
