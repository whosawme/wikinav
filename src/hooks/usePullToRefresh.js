import { useState, useEffect, useRef } from 'react';

export const usePullToRefresh = (onRefresh, threshold = 80) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const isPullingRef = useRef(false);
  const touchStartY = useRef(0);
  const containerRef = useRef(null);
  const pullDistanceRef = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isAtScrollTop = (target) => {
      // Walk up from the touch target to find scrollable ancestors
      let el = target;
      while (el && el !== container) {
        if (el.scrollTop > 0) return false;
        el = el.parentElement;
      }
      return true;
    };

    const handleTouchStart = (e) => {
      if (isRefreshing) return;
      // Only activate pull-to-refresh if the touched scrollable area is at its top
      if (isAtScrollTop(e.target)) {
        touchStartY.current = e.touches[0].clientY;
        isPullingRef.current = true;
      }
    };

    const handleTouchMove = (e) => {
      if (!isPullingRef.current || isRefreshing) return;

      const distance = Math.max(0, e.touches[0].clientY - touchStartY.current);
      const resistedDistance = distance * 0.6;

      if (resistedDistance > 0) {
        e.preventDefault();
        pullDistanceRef.current = Math.min(resistedDistance, threshold * 1.5);
        setPullDistance(pullDistanceRef.current);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistanceRef.current >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }
        setTimeout(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }, 500);
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, threshold, isRefreshing]);

  return {
    isRefreshing,
    pullDistance,
    isPulling: isPullingRef.current,
    bindRefresh: { ref: containerRef },
  };
};
