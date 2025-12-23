import React from 'react';

/**
 * GraphEdge - Renders a connection line between two nodes
 *
 * @param {number} startX - Start X position
 * @param {number} startY - Start Y position
 * @param {number} endX - End X position
 * @param {number} endY - End Y position
 * @param {boolean} suggested - Whether this connects to a "See also" node
 * @param {boolean} isMobile - Mobile layout flag
 */
const GraphEdge = ({
  startX,
  startY,
  endX,
  endY,
  suggested = false,
  isMobile = false
}) => (
  <line
    x1={startX}
    y1={startY}
    x2={endX}
    y2={endY}
    stroke={suggested ? '#94a3b8' : '#64748b'}
    strokeWidth={isMobile ? "1" : "2"}
    style={suggested ? { strokeOpacity: 0.5, strokeDasharray: '4 4' } : {}}
    className="transition-all duration-200"
  />
);

export default GraphEdge;
