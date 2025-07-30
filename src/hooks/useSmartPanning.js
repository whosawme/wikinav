import { useState, useEffect, useCallback } from 'react';

export const useSmartPanning = (pages, zoom, svgRef, isMobile) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panLimits, setPanLimits] = useState({ minX: 0, maxX: 0, minY: 0, maxY: 0 });

  // Calculate graph boundaries
  const getGraphBounds = useCallback(() => {
    if (pages.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    const padding = 100; // Extra padding around nodes
    return pages.reduce((bounds, page) => ({
      minX: Math.min(bounds.minX, page.x - padding),
      maxX: Math.max(bounds.maxX, page.x + padding),
      minY: Math.min(bounds.minY, page.y - padding),
      maxY: Math.max(bounds.maxY, page.y + padding)
    }), { 
      minX: pages[0].x - padding, 
      maxX: pages[0].x + padding, 
      minY: pages[0].y - padding, 
      maxY: pages[0].y + padding 
    });
  }, [pages]);

  // Calculate pan limits based on graph size and viewport
  const calculatePanLimits = useCallback(() => {
    if (!svgRef.current || pages.length === 0) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const viewportWidth = svgRect.width;
    const viewportHeight = svgRect.height;
    
    const graphBounds = getGraphBounds();
    const scaledGraphWidth = (graphBounds.maxX - graphBounds.minX) * zoom;
    const scaledGraphHeight = (graphBounds.maxY - graphBounds.minY) * zoom;
    
    let minX, maxX, minY, maxY;

    if (isMobile) {
      // Mobile: Root should stay at top-left, allow scrolling right and down only
      const rootNode = pages[0];
      if (rootNode) {
        const rootPadding = 50;
        
        // X limits: From root at left edge to right boundary
        minX = rootPadding - (rootNode.x * zoom);
        maxX = scaledGraphWidth > viewportWidth 
          ? viewportWidth - (graphBounds.maxX * zoom) - rootPadding
          : minX;
        
        // Y limits: From root at top edge to bottom boundary  
        minY = rootPadding - (rootNode.y * zoom);
        maxY = scaledGraphHeight > viewportHeight
          ? viewportHeight - (graphBounds.maxY * zoom) - rootPadding
          : minY;
      } else {
        minX = maxX = minY = maxY = 0;
      }
    } else {
      // Desktop: Allow panning in all directions but within graph bounds
      if (scaledGraphWidth <= viewportWidth) {
        // Graph fits horizontally - center it
        minX = maxX = (viewportWidth - scaledGraphWidth) / 2 - (graphBounds.minX * zoom);
      } else {
        // Graph larger than viewport - allow panning
        minX = viewportWidth - (graphBounds.maxX * zoom) - 50;
        maxX = -(graphBounds.minX * zoom) + 50;
      }
      
      if (scaledGraphHeight <= viewportHeight) {
        // Graph fits vertically - center it
        minY = maxY = (viewportHeight - scaledGraphHeight) / 2 - (graphBounds.minY * zoom);
      } else {
        // Graph larger than viewport - allow panning
        minY = viewportHeight - (graphBounds.maxY * zoom) - 50;
        maxY = -(graphBounds.minY * zoom) + 50;
      }
    }

    setPanLimits({ minX, maxX, minY, maxY });
  }, [pages, zoom, svgRef, isMobile, getGraphBounds]);

  // Update limits when dependencies change
  useEffect(() => {
    calculatePanLimits();
  }, [calculatePanLimits]);

  // Constrain pan to limits
  const constrainedSetPan = useCallback((newPan) => {
    const constrainedPan = {
      x: Math.min(Math.max(newPan.x, panLimits.minX), panLimits.maxX),
      y: Math.min(Math.max(newPan.y, panLimits.minY), panLimits.maxY)
    };
    
    // Only update if position actually changed (avoid infinite loops)
    setPan(prevPan => {
      if (prevPan.x !== constrainedPan.x || prevPan.y !== constrainedPan.y) {
        return constrainedPan;
      }
      return prevPan;
    });
  }, [panLimits]);

  return {
    pan,
    setPan: constrainedSetPan,
    panLimits,
    calculatePanLimits
  };
};