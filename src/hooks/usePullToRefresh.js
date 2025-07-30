import { useState, useEffect, useRef } from 'react';

export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartY = useRef(0);
  const touchMoveY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    // Only trigger if user is at the top of the page
    if (window.scrollY === 0) {
      touchStartY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || isRefreshing || window.scrollY > 0) {
      return;
    }

    touchMoveY.current = e.touches[0].clientY;
    const distance = Math.max(0, touchMoveY.current - touchStartY.current);
    
    // Add some resistance to the pull
    const resistedDistance = distance * 0.6;
    
    if (resistedDistance > 0) {
      e.preventDefault(); // Prevent default scroll behavior
      setPullDistance(Math.min(resistedDistance, threshold * 1.5));
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    setIsPulling(false);

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);
      
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      
      // Add a small delay for UX
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      // Animate back to 0
      setPullDistance(0);
    }
  };

  // Cleanup pull distance when refreshing completes
  useEffect(() => {
    if (!isRefreshing && !isPulling) {
      setPullDistance(0);
    }
  }, [isRefreshing, isPulling]);

  // Use useEffect to properly register non-passive event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Register touch events with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isPulling, isRefreshing, pullDistance]); // Dependencies to ensure handlers have latest state

  const bindRefresh = {
    ref: containerRef
  };

  return {
    isRefreshing,
    pullDistance,
    isPulling,
    bindRefresh
  };
};