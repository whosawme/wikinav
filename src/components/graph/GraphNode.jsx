import React from 'react';

/**
 * GraphNode - Renders a single node in the Wikipedia navigation graph
 *
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} title - Page title
 * @param {string} thumbnail - Thumbnail URL
 * @param {boolean} isActive - Whether this node is the active page
 * @param {boolean} suggested - Whether this is a "See also" suggested node
 * @param {function} onClick - Click handler
 * @param {boolean} isMobile - Mobile layout flag
 */
const GraphNode = ({
  x,
  y,
  title,
  thumbnail,
  isActive = false,
  suggested = false,
  onClick,
  isMobile = false
}) => {
  // Create safe IDs for SVG elements
  const safeId = `circle-clip-${title.replace(/[^a-zA-Z0-9]/g, '-')}-${x}-${y}`;
  const gradientId = `node-gradient-${safeId}`;

  // Scale everything down by 50% for mobile
  const scale = isMobile ? 0.5 : 1;
  const radius = 40 * scale;
  const outerRadius = 45 * scale;
  const imageSize = 80 * scale;
  const imageOffset = -40 * scale;

  // Split title into lines for display
  const lines = title.split(' ').reduce((acc, word) => {
    const lastLine = acc[acc.length - 1];
    if (!lastLine || (lastLine + ' ' + word).length > 15) {
      acc.push(word);
    } else {
      acc[acc.length - 1] = `${lastLine} ${word}`;
    }
    return acc;
  }, []);

  const textWidth = 80;
  const textHeight = lines.length * 18 + 10;

  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      className="transition-transform duration-200 ease-in-out"
    >
      <defs>
        <clipPath id={safeId}>
          <circle r={radius} />
        </clipPath>
        <radialGradient id={gradientId}>
          <stop offset="0%" stopColor={isActive ? '#3b82f6' : '#fff'} />
          <stop offset="100%" stopColor={isActive ? '#2563eb' : '#f8fafc'} />
        </radialGradient>
      </defs>

      {/* Node circle with gradient fill */}
      <circle
        r={outerRadius}
        fill={`url(#${gradientId})`}
        stroke={suggested ? '#94a3b8' : (isActive ? '#1d4ed8' : '#64748b')}
        strokeWidth={scale}
        style={suggested ? { opacity: 0.7 } : {}}
        className="transition-all duration-200 ease-in-out"
      />

      {/* Thumbnail image */}
      {thumbnail && (
        <image
          x={imageOffset}
          y={imageOffset}
          width={imageSize}
          height={imageSize}
          href={thumbnail}
          clipPath={`url(#${safeId})`}
          preserveAspectRatio="xMidYMid slice"
          className="transition-opacity duration-200"
        />
      )}

      {/* Title label with background */}
      <rect
        x={-textWidth / 2}
        y={-17}
        width={textWidth}
        height={textHeight}
        rx="6"
        fill="rgba(0, 0, 0, 0.3)"
      />

      <text
        textAnchor="middle"
        dy="60"
        fill="white"
        className={`text-sm ${isActive ? 'font-bold text-blue-400' : 'text-white'} transition-all duration-200`}
      >
        {lines.map((line, i) => (
          <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
};

export default GraphNode;
