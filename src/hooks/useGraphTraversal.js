import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * useGraphTraversal - Press-hold-drag gesture for graph node traversal
 *
 * Press and hold a node to reveal its related (See Also) pages in a radial layout.
 * Drag finger/cursor to a related page to highlight it.
 * Lift to navigate to the highlighted page.
 */
const useGraphTraversal = ({ pages, activePage, zoom, pan, svgRef, onNavigate, isMobile }) => {
  const [traversalState, setTraversalState] = useState(null);

  const holdTimerRef = useRef(null);
  const isHoldingRef = useRef(false);
  const movedRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const onNavigateRef = useRef(onNavigate);
  const traversalStateRef = useRef(traversalState);

  // Keep refs in sync
  useEffect(() => { onNavigateRef.current = onNavigate; }, [onNavigate]);
  useEffect(() => { traversalStateRef.current = traversalState; }, [traversalState]);

  const HOLD_DELAY = 400;
  const MOVE_THRESHOLD = 8;
  const RELATED_RADIUS = isMobile ? 100 : 140;

  const screenToGraph = useCallback((clientX, clientY) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan, svgRef]);

  const findNodeAt = useCallback((gx, gy, nodeList) => {
    const hitRadius = isMobile ? 25 : 45;
    for (const node of nodeList) {
      const dx = node.x - gx;
      const dy = node.y - gy;
      if (dx * dx + dy * dy < hitRadius * hitRadius) {
        return node;
      }
    }
    return null;
  }, [isMobile]);

  const buildRelatedNodes = useCallback((sourceNode) => {
    const links = sourceNode.seeAlso || [];
    if (links.length === 0) return [];

    const N = links.length;
    const cx = sourceNode.x;
    const cy = sourceNode.y;

    return links.map((link, i) => {
      const angle = (-Math.PI / 2) + (i / Math.max(N - 1, 1)) * Math.PI;
      return {
        id: `traversal-${i}-${link.title}`,
        title: link.title,
        url: link.url?.startsWith('http') ? link.url : `https://en.wikipedia.org${link.url}`,
        x: cx + RELATED_RADIUS * Math.cos(angle),
        y: cy + RELATED_RADIUS * Math.sin(angle),
      };
    });
  }, [RELATED_RADIUS]);

  const cancelHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
  }, []);

  const endTraversal = useCallback(() => {
    const state = traversalStateRef.current;
    cancelHold();
    if (state?.hoveredNode) {
      onNavigateRef.current({ title: state.hoveredNode.title, url: state.hoveredNode.url });
    }
    setTraversalState(null);
  }, [cancelHold]);

  const handleTraversalPointerDown = useCallback((e) => {
    if (e.touches && e.touches.length > 1) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    startPosRef.current = { x: clientX, y: clientY };
    movedRef.current = false;

    const gp = screenToGraph(clientX, clientY);
    const hitNode = findNodeAt(gp.x, gp.y, pages);
    if (!hitNode) return;

    isHoldingRef.current = true;

    holdTimerRef.current = setTimeout(() => {
      if (!isHoldingRef.current || movedRef.current) return;
      const related = buildRelatedNodes(hitNode);
      if (related.length === 0) return;

      setTraversalState({
        sourceNode: hitNode,
        relatedNodes: related,
        hoveredNode: null,
        origin: { x: clientX, y: clientY },
      });
    }, HOLD_DELAY);
  }, [pages, screenToGraph, findNodeAt, buildRelatedNodes]);

  const handleTraversalPointerMove = useCallback((e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startPosRef.current.x;
    const dy = clientY - startPosRef.current.y;
    if (dx * dx + dy * dy > MOVE_THRESHOLD * MOVE_THRESHOLD) {
      movedRef.current = true;
      if (!traversalStateRef.current) {
        cancelHold();
      }
    }

    if (!traversalStateRef.current) return;

    const gp = screenToGraph(clientX, clientY);
    const hitRelated = findNodeAt(gp.x, gp.y, traversalStateRef.current.relatedNodes);
    setTraversalState(prev => prev ? { ...prev, hoveredNode: hitRelated } : null);
  }, [screenToGraph, findNodeAt, cancelHold]);

  const handleTraversalPointerUp = useCallback(() => {
    if (traversalStateRef.current) {
      endTraversal();
    } else {
      cancelHold();
    }
  }, [endTraversal, cancelHold]);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  return {
    traversalState,
    handleTraversalPointerDown,
    handleTraversalPointerMove,
    handleTraversalPointerUp,
    cancelTraversal: () => { cancelHold(); setTraversalState(null); },
  };
};

export default useGraphTraversal;
