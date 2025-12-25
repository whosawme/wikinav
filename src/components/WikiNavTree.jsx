import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Github, MessagesSquare as Discord, Download, Maximize2, Minimize2, ChevronLeft, ChevronRight, Share2, Rabbit } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import LoadingBunny from './LoadingBunny';
import PWAInstallPrompt from './PWAInstallPrompt';
import MobileBottomNav from './MobileBottomNav';
import PullToRefresh from './PullToRefresh';
import RabbitHoleShelf from './RabbitHoleShelf';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSmartPanning } from '../hooks/useSmartPanning';
import MobileScrollHints from './MobileScrollHints';
import { useWikipediaSearch } from '../hooks/useWikipediaSearch';
import {
  fetchHomePage,
  fetchWikiContent,
  fetchWikiThumbnail,
  checkPageType,
  loadPageData,
  parseSeeAlsoLinks,
  getRelatedLinks
} from '../services/wikipediaApi';

    
const NavigationBar = ({
  handleBack,
  handleForward,
  historyIndex,
  navigationHistory,
  handleSubmit,
  searchInput,
  handleInputChange,
  searchResults,
  isSearchLoading,
  loadNewPage,
  setSearchInput,
  clearSearchResults
}) => {
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const handleKeyDown = (e) => {
    if (searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          e.preventDefault();
          const selectedResult = searchResults[selectedIndex];
          loadNewPage({ title: selectedResult.title, url: selectedResult.url });
          setSearchInput('');
          clearSearchResults();
          setSelectedIndex(-1);
        }
        break;
      case 'Escape':
        clearSearchResults();
        setSelectedIndex(-1);
        break;
    }
  };

  // Reset selected index when search results change
  React.useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  return (
  <div className="flex items-center px-4 mb-4 relative z-50 gap-2">
    <button
      onClick={handleBack}
      disabled={historyIndex <= 0}
      className={`p-2 rounded-full shadow transition-all duration-200 ${
        historyIndex <= 0
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
      }`}
    >
      <ArrowLeft size={20} />
    </button>

    <button
      onClick={handleForward}
      disabled={historyIndex >= navigationHistory.length - 1}
      className={`p-2 rounded-full shadow transition-all duration-200 ${
        historyIndex >= navigationHistory.length - 1
          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
      }`}
    >
      <ArrowLeft size={20} className="rotate-180" />
    </button>

    <form onSubmit={handleSubmit} className="flex-1">
      <div className="relative">
        <input
          type="text"
          value={searchInput}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter Wikipedia URL or search term..."
          className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
          style={{
            WebkitTapHighlightColor: 'transparent',
            tapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            WebkitAppearance: 'none',
            MozAppearance: 'textfield'
          }}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck="false"
          role="combobox"
          aria-expanded={searchResults.length > 0}
          aria-activedescendant={selectedIndex >= 0 ? `search-option-${selectedIndex}` : undefined}
        />
        {searchResults.length > 0 && (
          <div
            className="absolute w-full mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            role="listbox"
          >
            {searchResults.map((result, index) => (
              <div
                key={index}
                id={`search-option-${index}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={`p-3 cursor-pointer transition-colors duration-150 border-b last:border-b-0 ${
                  index === selectedIndex
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                style={{
                  WebkitTapHighlightColor: 'rgba(59, 130, 246, 0.2)',
                  tapHighlightColor: 'rgba(59, 130, 246, 0.2)',
                  touchAction: 'manipulation'
                }}
                onClick={async () => {
                  await loadNewPage({ title: result.title, url: result.url });
                  setSearchInput('');
                  clearSearchResults();
                  setSelectedIndex(-1);
                }}
                onMouseEnter={() => {
                  // Update selected index on mouse hover
                  setSelectedIndex(index);
                }}
              >
                <div className={`font-medium ${
                  index === selectedIndex ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {result.title}
                </div>
                <div className={`text-sm mt-1 ${
                  index === selectedIndex ? 'text-blue-700' : 'text-gray-600'
                }`}>
                  {result.description}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  </div>
  );
};


const useViewportSize = () => {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
  
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  
  
  useEffect(() => {
    const handleResize = () => {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
};



// Custom icon component for related articles (if used)
const NetworkNodesIcon = ({ size = 20, className = "" }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <circle cx="12" cy="12" r="3" />
    <circle cx="4" cy="12" r="2" opacity="0.5" />
    <circle cx="20" cy="12" r="2" opacity="0.5" />
    <circle cx="12" cy="4" r="2" opacity="0.5" />
    <circle cx="12" cy="20" r="2" opacity="0.5" />
  </svg>
);

// Network View Panel Component
const NetworkViewPanel = ({ isOpen, onClose, pages, activePage }) => {
  const networkSvgRef = React.useRef(null);
  const [networkZoom, setNetworkZoom] = React.useState(1);
  const [networkPan, setNetworkPan] = React.useState({ x: 0, y: 0 });
  const [isDraggingNetwork, setIsDraggingNetwork] = React.useState(false);
  const [dragStartNetwork, setDragStartNetwork] = React.useState({ x: 0, y: 0 });
  const simulationRef = React.useRef(null);
  const [networkNodes, setNetworkNodes] = React.useState([]);
  const [networkLinks, setNetworkLinks] = React.useState([]);

  // Initialize network data when panel opens
  React.useEffect(() => {
    if (isOpen && pages.length > 0) {
      // Filter out redirect pages from network view
      const nonRedirectPages = pages.filter(p => !p.isRedirect);
      const nonRedirectIds = new Set(nonRedirectPages.map(p => p.id));

      // Clone the non-redirect pages data for network view
      const clonedNodes = nonRedirectPages.map(page => ({
        ...page,
        x: page.x || 0,
        y: page.y || 0,
        id: page.id,
        title: page.title,
        thumbnail: page.thumbnail,
        isActive: activePage && page.id === activePage.id
      }));

      // Create links from parent-child relationships (only for non-redirect nodes)
      const links = [];
      nonRedirectPages.forEach(page => {
        if (page.children) {
          page.children.forEach(childId => {
            // Only include link if child is also a non-redirect node
            if (nonRedirectIds.has(childId)) {
              links.push({
                source: page.id,
                target: childId
              });
            }
          });
        }
      });

      setNetworkNodes(clonedNodes);
      setNetworkLinks(links);

      // Start force simulation with cloned data
      setTimeout(() => {
        if (networkSvgRef.current) {
          runNetworkSimulation(clonedNodes, links);
        }
      }, 100);
    }

    // Cleanup simulation when closing
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, [isOpen, pages, activePage]);

  const runNetworkSimulation = (nodes, links) => {
    const width = networkSvgRef.current.clientWidth;
    const height = networkSvgRef.current.clientHeight;

    // Stop any existing simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-1500))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(80))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05));

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      setNetworkNodes([...nodes]);
    });
  };

  const handleNetworkWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setNetworkZoom(z => Math.min(Math.max(0.3, z + delta), 3));
    }
  };

  const handleNetworkMouseDown = (e) => {
    if (e.button === 0) {
      setIsDraggingNetwork(true);
      setDragStartNetwork({ x: e.clientX - networkPan.x, y: e.clientY - networkPan.y });
    }
  };

  const handleNetworkMouseMove = (e) => {
    if (isDraggingNetwork) {
      setNetworkPan({ x: e.clientX - dragStartNetwork.x, y: e.clientY - dragStartNetwork.y });
    }
  };

  const handleNetworkMouseUp = () => {
    setIsDraggingNetwork(false);
  };

  // Fit network to view
  const fitNetwork = () => {
    if (networkSvgRef.current && networkNodes.length > 0) {
      const padding = 50;
      const bounds = networkNodes.reduce((acc, node) => ({
        minX: Math.min(acc.minX, node.x - 50),
        maxX: Math.max(acc.maxX, node.x + 50),
        minY: Math.min(acc.minY, node.y - 50),
        maxY: Math.max(acc.maxY, node.y + 50)
      }), { 
        minX: networkNodes[0].x, 
        maxX: networkNodes[0].x, 
        minY: networkNodes[0].y, 
        maxY: networkNodes[0].y 
      });

      const svgWidth = networkSvgRef.current.clientWidth - padding * 2;
      const svgHeight = networkSvgRef.current.clientHeight - padding * 2;
      const graphWidth = bounds.maxX - bounds.minX;
      const graphHeight = bounds.maxY - bounds.minY;
      
      const scale = Math.min(svgWidth / graphWidth, svgHeight / graphHeight, 2);
      setNetworkZoom(scale);
      setNetworkPan({
        x: svgWidth / 2 - ((bounds.minX + graphWidth / 2) * scale) + padding,
        y: svgHeight / 2 - ((bounds.minY + graphHeight / 2) * scale) + padding
      });
    }
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      onMouseMove={handleNetworkMouseMove}
      onMouseUp={handleNetworkMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h2 className="text-xl font-semibold text-gray-800">Network View</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={fitNetwork}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Fit to View"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h4v4" />
              <path d="M3 21h4v-4" />
              <path d="M21 3h-4v4" />
              <path d="M21 21h-4v-4" />
              <circle cx="12" cy="12" r="1" fill="currentColor" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Network SVG */}
      <div className="h-full overflow-hidden">
        <svg
          ref={networkSvgRef}
          width="100%"
          height="100%"
          onWheel={handleNetworkWheel}
          onMouseDown={handleNetworkMouseDown}
          style={{ cursor: isDraggingNetwork ? 'grabbing' : 'grab' }}
          className="bg-gray-50"
        >
          <g transform={`translate(${networkPan.x}, ${networkPan.y}) scale(${networkZoom})`}>
            {/* Render edges */}
            {networkLinks.map((link, idx) => {
              const sourceNode = networkNodes.find(n => n.id === link.source.id || n.id === link.source);
              const targetNode = networkNodes.find(n => n.id === link.target.id || n.id === link.target);
              if (!sourceNode || !targetNode) return null;
              
              return (
                <line
                  key={`network-link-${idx}`}
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  opacity="0.6"
                />
              );
            })}
            
            {/* Render nodes */}
            {networkNodes.map(node => (
              <g key={`network-node-${node.id}`} transform={`translate(${node.x},${node.y})`}>
                <circle
                  r="40"
                  fill={node.isActive ? '#3b82f6' : '#fff'}
                  stroke={node.isActive ? '#1d4ed8' : '#64748b'}
                  strokeWidth="2"
                />
                {node.thumbnail && (
                  <image
                    x="-35"
                    y="-35"
                    width="70"
                    height="70"
                    href={node.thumbnail}
                    clipPath="url(#network-circle-clip)"
                    preserveAspectRatio="xMidYMid slice"
                  />
                )}
                <text
                  textAnchor="middle"
                  dy="55"
                  fill="#1f2937"
                  className="text-sm font-medium"
                >
                  {node.title.length > 20 ? node.title.substring(0, 20) + '...' : node.title}
                </text>
              </g>
            ))}
          </g>
          
          <defs>
            <clipPath id="network-circle-clip">
              <circle r="35" />
            </clipPath>
          </defs>
        </svg>
      </div>
    </div>
  );
};

// Styles are now imported via src/styles/wikiContent.css (loaded in index.css)

// Node component with enhanced styling
const NodeComponent = ({ x, y, title, thumbnail, isActive, suggested, onClick, isMobile = false }) => {
  const safeId = `circle-clip-${title.replace(/[^a-zA-Z0-9]/g, '-')}`;
  const gradientId = `node-gradient-${safeId}`;
  
  // Scale everything down by 50% for mobile
  const scale = isMobile ? 0.5 : 1;
  const radius = 40 * scale;
  const outerRadius = 45 * scale;
  const imageSize = 80 * scale;
  const imageOffset = -40 * scale;
  
  return (
    // <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: 'pointer' }} className="transition-transform duration-200 ease-in-out">
    //   <defs>
    //     <clipPath id={safeId}>
    //       <circle r="25" />
    //     </clipPath>
    //     <radialGradient id={gradientId}>
    //       <stop offset="0%" stopColor={isActive ? '#3b82f6' : '#fff'} />
    //       <stop offset="100%" stopColor={isActive ? '#2563eb' : '#f8fafc'} />
    //     </radialGradient>
    //   </defs>
    //   <circle 
    //     r="30" 
    //     fill={`url(#${gradientId})`}
    //     stroke={suggested ? '#94a3b8' : (isActive ? '#1d4ed8' : '#64748b')}
    //     strokeWidth="2"
    //     style={suggested ? { opacity: 0.7 } : {}}
    //     className="transition-all duration-200 ease-in-out"
    //   />
    //   {thumbnail && (
    //     <image
    //       x="-25"
    //       y="-25"
    //       width="50"
    //       height="50"
    //       href={thumbnail}
    //       clipPath={`url(#${safeId})`}
    //       preserveAspectRatio="xMidYMid slice"
    //       className="transition-opacity duration-200"
    //     />
    //   )}
    //   <text 
    //     textAnchor="middle" 
    //     dy="50"
    //     style={suggested ? { opacity: 0.8, fill: '#64748b' } : {}}
    //     className={`text-sm ${isActive ? 'font-bold text-blue-600' : 'text-slate-700'} transition-all duration-200`}
    //   >
    //     {title.split(' ').reduce((lines, word) => {
    //       const lastLine = lines[lines.length - 1];
    //       if (!lastLine || (lastLine + ' ' + word).length > 15) {
    //         lines.push(word);
    //       } else {
    //         lines[lines.length - 1] = `${lastLine} ${word}`;
    //       }
    //       return lines;
    //     }, []).map((line, i) => (
    //       <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
    //         {line}
    //       </tspan>
    //     ))}
    //   </text>
    // </g>

<g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: 'pointer' }} className="transition-transform duration-200 ease-in-out">
  <defs>
    <clipPath id={safeId}>
      <circle r={radius} />
    </clipPath>
    <radialGradient id={gradientId}>
      <stop offset="0%" stopColor={isActive ? '#3b82f6' : '#fff'} />
      <stop offset="100%" stopColor={isActive ? '#2563eb' : '#f8fafc'} />
    </radialGradient>
  </defs>
  <circle 
    r={outerRadius}  
    fill={`url(#${gradientId})`}
    stroke={suggested ? '#94a3b8' : (isActive ? '#1d4ed8' : '#64748b')}
    strokeWidth={scale}
    style={suggested ? { opacity: 0.7 } : {}}
    className="transition-all duration-200 ease-in-out"
  />
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
  {/* <text 
    textAnchor="middle" 
    dy="60"  
    style={suggested ? { opacity: 0.8, fill: '#64748b' } : {}}
    className={`text-sm ${isActive ? 'font-bold text-blue-600' : 'text-slate-700'} transition-all duration-200`}
  >
    {title.split(' ').reduce((lines, word) => {
      const lastLine = lines[lines.length - 1];
      if (!lastLine || (lastLine + ' ' + word).length > 15) {
        lines.push(word);
      } else {
        lines[lines.length - 1] = `${lastLine} ${word}`;
      }
      return lines;
    }, []).map((line, i) => (
      <tspan key={i} x="0" dy={i === 0 ? 0 : '1.2em'}>
        {line}
      </tspan>
    ))}
  </text> */}


{(() => {
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
      <>
       
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
      </>
    );
  })()}
</g>



  );
};

// Redirect node component - shows as text line instead of circle
const RedirectNodeComponent = ({ x, y, title, redirectTarget, isActive, onClick, isMobile = false }) => {
  const scale = isMobile ? 0.7 : 1;
  const boxWidth = 120 * scale;
  const boxHeight = 50 * scale;

  return (
    <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: 'pointer' }} className="transition-transform duration-200 ease-in-out">
      {/* Horizontal line before box */}
      <line
        x1={-boxWidth / 2 - 20}
        y1={0}
        x2={-boxWidth / 2}
        y2={0}
        stroke="#94a3b8"
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      {/* Box with redirect info */}
      <rect
        x={-boxWidth / 2}
        y={-boxHeight / 2}
        width={boxWidth}
        height={boxHeight}
        rx="4"
        fill={isActive ? '#f0f9ff' : '#f8fafc'}
        stroke={isActive ? '#3b82f6' : '#94a3b8'}
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      {/* "Redirect to:" label */}
      <text
        textAnchor="middle"
        y={-8 * scale}
        fill="#64748b"
        fontSize={10 * scale}
        fontStyle="italic"
      >
        Redirect to:
      </text>
      {/* Target title */}
      <text
        textAnchor="middle"
        y={12 * scale}
        fill={isActive ? '#1d4ed8' : '#334155'}
        fontSize={11 * scale}
        fontWeight={isActive ? 'bold' : 'normal'}
      >
        {(redirectTarget || title).length > 18
          ? (redirectTarget || title).slice(0, 16) + '...'
          : (redirectTarget || title)}
      </text>
    </g>
  );
};

// Edge component with arrows removed
const EdgeComponent = ({ startX, startY, endX, endY, suggested, isMobile = false }) => (
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

// Resizer component
const Resizer = ({ onMouseDown }) => (
  <div 
    className="w-2 cursor-col-resize bg-gray-200 hover:bg-gray-300 active:bg-gray-400 transition-colors" 
    onMouseDown={onMouseDown} 
  />
);

// Tree Controls Component
const TreeControls = ({ onCenter, onFit, horizontalSpread, setHorizontalSpread }) => (
  <div className="tree-controls space-y-2">

  </div>
);

// getRelatedLinks is now imported from services/wikipediaApi.js
// It parses real "See also" links from Wikipedia HTML content

const WikiNavTree = () => {
  // State declarations
  const [isTreePaneCollapsed, setIsTreePaneCollapsed] = useState(false);
  const [scrollY, setScrollY] = useState(0); //scroll tracking for header
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const viewport = useViewportSize();
  const isMobile = viewport.width < 768;

  const [horizontalSpread, setHorizontalSpread] = useState(300);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);

  // Use the debounced search hook instead of manual state
  const {
    query: searchInput,
    setQuery: setSearchInput,
    results: searchResults,
    isLoading: isSearchLoading,
    clearResults: clearSearchResults
  } = useWikipediaSearch(300); // 300ms debounce

  const [wikiContent, setWikiContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [leftPaneWidth, setLeftPaneWidth] = useState(
    isMobile ? viewport.width : Math.min(400, viewport.width * 0.4)
  );
  const [isResizing, setIsResizing] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isSplayed, setIsSplayed] = useState(false);
  const [showSeeAlso, setShowSeeAlso] = useState(false);
  const [seeAlsoNodes, setSeeAlsoNodes] = useState([]);
  const [showNetworkView, setShowNetworkView] = useState(false);
  const [showRabbitHole, setShowRabbitHole] = useState(false);

  const [treePaneMode, setTreePaneMode] = useState('normal'); // 'collapsed', 'normal', 'expanded'

  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // Refs - declare before using in hooks
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const simulationRef = useRef(null);

  // Clean up D3 simulation on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    };
  }, []);

  // Wikipedia API wrapper functions - defined early because they're used in hooks below
  const loadHomePage = useCallback(async () => {
    setLoading(true);
    try {
      const content = await fetchHomePage();
      if (content) {
        setWikiContent(content);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWikiContent = useCallback(async (title) => {
    setLoading(true);
    try {
      return await fetchWikiContent(title);
    } finally {
      setLoading(false);
    }
  }, []);

  // Smart panning with boundaries
  const { pan, setPan, panLimits } = useSmartPanning(pages, zoom, svgRef, isMobile);

  // Pull to refresh functionality for mobile
  const { isRefreshing: isPullRefreshing, pullDistance, bindRefresh } = usePullToRefresh(
    async () => {
      // Refresh current page or go to home page
      if (activePage) {
        const content = await fetchWikiContent(activePage.title);
        if (content) {
          setWikiContent(content);
        }
      } else {
        await loadHomePage();
      }
    }
  );

  const handleTouchStartSwipe = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEndSwipe = (e) => {
    setTouchEnd(e.changedTouches[0].clientX);
    const swipeDistance = touchStart - touchEnd;
    
    if (Math.abs(swipeDistance) > 50) { // Min swipe distance
      if (swipeDistance > 0) {
        handleForward();
      } else {
        handleBack();
      }
    }
  };

  const [isLoadingShared, setIsLoadingShared] = useState(false);

  const handleShare = () => {
    try {
      const shareData = {
        nodes: pages.map(p => ({
          id: p.id,
          title: p.title,
          children: p.children || []
        })),
        activeId: activePage?.id
      };
  
      const str = JSON.stringify(shareData);
      const base64 = btoa(unescape(encodeURIComponent(str)));
      const shareUrl = `${window.location.origin}${window.location.pathname}?t=${base64}`;
  
      navigator.clipboard.writeText(shareUrl)
        .then(() => alert('Share link copied!'))
        .catch(err => console.error('Clipboard failed:', err));
    } catch (err) {
      console.error('Share creation failed:', err);
    }
  };

  // Handle wiki content scroll for search bar visibility
  const handleWikiScroll = (e) => {
    if (!isMobile) return;
    
    const currentScrollY = e.target.scrollTop;
    const scrollThreshold = 20; // Minimum scroll distance to trigger hide/show
    
    if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) return;
    
    if (currentScrollY > lastScrollY && currentScrollY > 100) {
      // Scrolling down and past 100px - hide search bar
      setIsSearchBarVisible(false);
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up - show search bar
      setIsSearchBarVisible(true);
    }
    
    setLastScrollY(currentScrollY);
  };
  

  const loadSharedTree = async (data) => {
    setIsLoadingShared(true);
    try {
      const parsedData = JSON.parse(data);
      const { nodes } = parsedData;

      const width = svgRef.current.clientWidth;
      const height = svgRef.current.clientHeight;

      // Adjust initial positions based on mobile/desktop
      const radius = Math.min(width, height) / 4;
      const centerX = isMobile ? height / 2 : width / 2;
      const centerY = isMobile ? width / 2 : height / 2;

      // Load nodes individually, filtering out any that fail (e.g., deleted pages)
      const loadedNodes = (await Promise.all(nodes.map(async (node, index) => {
        try {
          const content = await fetchWikiContent(node.title);
          // Skip nodes where content fetch failed
          if (!content) return null;

          const thumbnail = await fetchWikiThumbnail(node.title);
          const angle = (2 * Math.PI * index) / nodes.length;

          return {
            ...node,
            content,
            thumbnail,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        } catch (err) {
          console.warn(`Skipping node "${node.title}": ${err.message}`);
          return null;
        }
      }))).filter(Boolean); // Remove null entries

      // Update children arrays to remove references to skipped nodes
      const validIds = new Set(loadedNodes.map(n => n.id));
      loadedNodes.forEach(node => {
        if (node.children) {
          node.children = node.children.filter(childId => validIds.has(childId));
        }
      });

      setPages(loadedNodes);
      if (loadedNodes.length > 0) {
        setActivePage(loadedNodes[0]);
        setWikiContent(loadedNodes[0].content);
      }

      setTimeout(() => {
        applyForceDirectedLayout(loadedNodes, svgRef.current, isMobile);
      }, 100);
    } catch (error) {
      console.error('Share load failed:', error);
    } finally {
      setIsLoadingShared(false);
    }
  };

  // to avoid key collisions
  const generateUniqueId = () => `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  useEffect(() => {
    document.title = 'WikiNav';
    const urlParams = new URLSearchParams(window.location.search);
    const sharedTreeData = urlParams.get('t');
    if (sharedTreeData) {
      const decoded = decodeURIComponent(escape(atob(sharedTreeData)));
      loadSharedTree(decoded);
    } else {
      loadHomePage();
    }
  }, [loadHomePage]);

  useEffect(() => {
    if (isMobile) {
      setLeftPaneWidth(viewport.width);
    } else {
      setLeftPaneWidth(Math.min(400, viewport.width * 0.4));
    }
  }, [viewport.width, isMobile]);

  // Global mouse event handlers
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    
    
    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
      if (isResizing && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = e.clientX - containerRect.left;
        setLeftPaneWidth(Math.max(200, Math.min(newWidth, window.innerWidth - 400)));
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, isResizing, dragStart]);

  // Update the CollapseButton component
  const CollapseButton = ({ mode, onClick, isMobile }) => (
    <button
      onClick={onClick}
      className={`absolute bg-white shadow-md p-2 border ${isMobile ? 'rounded-full' : 'rounded-r-full border-l-0'}`}
      style={{
        ...(isMobile ? {
          left: '50%',
          bottom: '-20px',  // Position at bottom of tree pane
          transform: 'translateX(-50%)',
          zIndex: 50,
        } : {
          top: '50%',
          right: '-20px',
          transform: 'translateY(-50%)',
          zIndex: 50,
        })
      }}
    >
      <ChevronLeft
        size={24}
        className={`transition-transform duration-200 ${
          isMobile
            ? mode === 'collapsed' ? '-rotate-90' : 'rotate-90'
            : mode === 'collapsed' ? 'rotate-180' : ''
        }`}
      />
    </button>
  );


    // Update the main tree pane width logic
  const getTreePaneWidth = () => {
    if (isMobile) {
      return '100%';
    }
    switch(treePaneMode) {
      case 'collapsed':
        return '0.5rem';
      case 'normal':
        return `${leftPaneWidth}px`;
      case 'expanded':
        return '85vw';
    }
  };

  // Update tree pane toggle handler
  const handleTreePaneToggle = () => {
    switch(treePaneMode) {
      case 'collapsed':
        setTreePaneMode('normal');
        break;
      case 'normal':
        setTreePaneMode('expanded');
        break;
      case 'expanded':
        setTreePaneMode('collapsed');
        break;
    }
  };
    
  
  // lower z score to keep collapse button up front
  const searchBarContainer = `
    flex items-center px-4 mb-4 relative z-[01]
  `;
  

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(z => Math.min(Math.max(0.5, z + delta), 2));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setDragStart({ 
        x: e.touches[0].clientX - pan.x, 
        y: e.touches[0].clientY - pan.y 
      });
    }
  };
  
  const handleTouchMove = (e) => {
    if (e.touches.length === 1) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };
  
  // Add ref for pinch zoom
  const lastPinchDistance = useRef(null);
  
  const handleTouchZoom = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
      );
  
      if (lastPinchDistance.current) {
        const delta = dist - lastPinchDistance.current;
        setZoom(z => Math.min(Math.max(0.5, z + delta * 0.01), 2));
      }
      lastPinchDistance.current = dist;
    }
  };

  // Graph functions
  const getGraphBoundaries = () => {
    if (pages.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    return pages.reduce((bounds, page) => ({
      minX: Math.min(bounds.minX, page.x - 50),
      maxX: Math.max(bounds.maxX, page.x + 50),
      minY: Math.min(bounds.minY, page.y - 50),
      maxY: Math.max(bounds.maxY, page.y + 50)
    }), { minX: pages[0].x, maxX: pages[0].x, minY: pages[0].y, maxY: pages[0].y });
  };

  const handleFitGraph = () => {
    if (svgRef.current && pages.length > 0) {
      const svg = svgRef.current;
      const bounds = getGraphBoundaries();
      const padding = 50;
      const svgWidth = svg.clientWidth - padding * 2;
      const svgHeight = svg.clientHeight - padding * 2;
      const graphWidth = bounds.maxX - bounds.minX;
      const graphHeight = bounds.maxY - bounds.minY;
      const scale = Math.min(svgWidth / graphWidth, svgHeight / graphHeight, 1.5);
      
      setZoom(scale);
      
      if (isMobile) {
        // Mobile: Keep default zoom and position root at top-left with padding
        setZoom(1); // Reset to default zoom instead of calculated scale
        const rootNode = pages[0];
        if (rootNode) {
          setPan({
            x: padding - rootNode.x,
            y: padding - rootNode.y
          });
        }
      } else {
        // Desktop: Center the graph
        setPan({
          x: svgWidth / 2 - ((bounds.minX + graphWidth / 2) * scale) + padding,
          y: svgHeight / 2 - ((bounds.minY + graphHeight / 2) * scale) + padding
        });
      }
    }
  };

  const handleCenterGraph = () => {
    if (pages.length > 0) {
      if (isMobile) {
        // Mobile: Reset to root at top-left
        const rootNode = pages[0];
        if (rootNode) {
          setPan({
            x: 50 - rootNode.x,
            y: 50 - rootNode.y
          });
        }
      } else {
        // Desktop: Center view
        setPan({ x: 50, y: 50 });
      }
      setZoom(1);
    }
  };

  // Apply a compact (static) layout by recalculating positions recursively.
  // actually lets not do recursive stuff for now, to avoid infinite loops without proper termination conditions
  const applyCompactLayout = () => {
    if (pages.length === 0) return;
    
    // First, create a mapping of nodes and their levels
    const levels = new Map();
    const processed = new Set();
    
    // Mobile vs Desktop spacing - increased for better readability
    const isMobile = viewport.width < 768;
    const NODE_SIZE = isMobile ? 140 : 100; // Increased from 80/60 to prevent overlap
    const LEVEL_SPACING = isMobile ? 100 : 120; // Increased for better separation
    
    // Step 1: Assign levels to all nodes (like git branch depth)
    const assignLevels = (nodeId, level = 0) => {
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(nodeId);
      processed.add(nodeId);
      
      const node = pages.find(p => p.id === nodeId);
      if (node && node.children) {
        node.children.forEach(childId => {
          if (!processed.has(childId)) {
            assignLevels(childId, level + 1);
          }
        });
      }
    };
  
    // Start with root node
    if (pages.length > 0) {
      assignLevels(pages[0].id);
    }
    
    // Handle any orphaned nodes that weren't reached from root
    pages.forEach(page => {
      if (!processed.has(page.id)) {
        // Try to find its proper level based on parent
        const parentId = findParentId(page.id);
        if (parentId && processed.has(parentId)) {
          // Find parent's level
          let parentLevel = 0;
          for (const [level, nodes] of levels.entries()) {
            if (nodes.includes(parentId)) {
              parentLevel = level;
              break;
            }
          }
          assignLevels(page.id, parentLevel + 1);
        } else {
          // Orphaned node - put at level 0
          assignLevels(page.id, 0);
        }
      }
    });
  
    // Step 2: Position nodes by level, adjusting for overlaps
    const newPositions = new Map();
    
    // Process each level
    Array.from(levels.keys()).sort((a, b) => a - b).forEach(level => {
      const nodesInLevel = levels.get(level);
      
      // First pass: position nodes based on parent or evenly
      nodesInLevel.forEach((nodeId, index) => {
        const node = pages.find(p => p.id === nodeId);
        let x, y;
        
        if (isMobile) {
          // Mobile: horizontal flow (x increases with level, y varies for siblings)
          x = level * LEVEL_SPACING + 50;
          
          if (level > 0) {
            const parentId = findParentId(nodeId);
            if (parentId && newPositions.has(parentId)) {
              const parentY = newPositions.get(parentId).y;
              const parent = pages.find(p => p.id === parentId);
              const siblingCount = parent ? parent.children.length : 1;
              const siblingIndex = parent ? parent.children.indexOf(nodeId) : 0;
              y = parentY + (siblingIndex - (siblingCount - 1) / 2) * NODE_SIZE;
            } else {
              y = (index + 0.5) * NODE_SIZE;
            }
          } else {
            y = (index + 0.5) * NODE_SIZE;
          }
        } else {
          // Desktop: vertical flow (y increases with level, x varies for siblings)
          y = level * LEVEL_SPACING + 50;

          if (level > 0) {
            const parentId = findParentId(nodeId);
            if (parentId && newPositions.has(parentId)) {
              const parentX = newPositions.get(parentId).x;
              const parent = pages.find(p => p.id === parentId);
              const siblingCount = parent ? parent.children.length : 1;
              const siblingIndex = parent ? parent.children.indexOf(nodeId) : 0;
              // Center siblings around parent's X position
              x = parentX + (siblingIndex - (siblingCount - 1) / 2) * NODE_SIZE;
            } else {
              x = (index + 0.5) * NODE_SIZE;
            }
          } else {
            x = (index + 0.5) * NODE_SIZE;
          }
        }
        
        newPositions.set(nodeId, { x, y });
      });
      
      // Second pass: resolve overlaps using FR-inspired repulsion
      let hasOverlap;
      do {
        hasOverlap = false;
        nodesInLevel.forEach((nodeId, i) => {
          const pos1 = newPositions.get(nodeId);
          if (!pos1) return;
          
          nodesInLevel.forEach((otherId, j) => {
            if (i >= j) return;
            
            const pos2 = newPositions.get(otherId);
            if (!pos2) return;
            
            let distance, moveDirection;
            
            if (isMobile) {
              // Mobile: check Y distance (nodes are spread vertically)
              const dy = pos2.y - pos1.y;
              distance = Math.abs(dy);
              moveDirection = 'y';
            } else {
              // Desktop: check X distance (nodes are spread horizontally)
              const dx = pos2.x - pos1.x;
              distance = Math.abs(dx);
              moveDirection = 'x';
            }
            
            if (distance < NODE_SIZE) {
              hasOverlap = true;
              const repulsion = (NODE_SIZE - distance) / 2;
              
              if (moveDirection === 'y') {
                const moveY = repulsion * Math.sign(pos2.y - pos1.y);
                newPositions.set(nodeId, {
                  ...pos1,
                  y: pos1.y - moveY
                });
                newPositions.set(otherId, {
                  ...pos2,
                  y: pos2.y + moveY
                });
              } else {
                const moveX = repulsion * Math.sign(pos2.x - pos1.x);
                newPositions.set(nodeId, {
                  ...pos1,
                  x: pos1.x - moveX
                });
                newPositions.set(otherId, {
                  ...pos2,
                  x: pos2.x + moveX
                });
              }
            }
          });
        });
      } while (hasOverlap);
    });

    // Final pass: ensure all nodes stay within left boundary (shift tree right if needed)
    let minX = Infinity;
    let minY = Infinity;
    newPositions.forEach(pos => {
      if (pos.x < minX) minX = pos.x;
      if (pos.y < minY) minY = pos.y;
    });

    // Shift all positions if any node is too far left/top
    const MIN_PADDING = 50;
    const shiftX = minX < MIN_PADDING ? MIN_PADDING - minX : 0;
    const shiftY = minY < MIN_PADDING ? MIN_PADDING - minY : 0;

    if (shiftX > 0 || shiftY > 0) {
      newPositions.forEach((pos, nodeId) => {
        newPositions.set(nodeId, {
          x: pos.x + shiftX,
          y: pos.y + shiftY
        });
      });
    }

    // Apply new positions to pages - ensure ALL pages get updated
    setPages(prevPages => 
      prevPages.map(page => {
        const newPos = newPositions.get(page.id);
        if (newPos) {
          return {
            ...page,
            x: newPos.x,
            y: newPos.y
          };
        } else {
          // Fallback for any nodes that somehow weren't positioned
          console.warn(`Node ${page.id} (${page.title}) was not positioned in compact layout`);
          return {
            ...page,
            x: 50,
            y: 50
          };
        }
      })
    );
  };
  
  // Helper function to find parent ID of a node
  const findParentId = (nodeId) => {
    const parent = pages.find(p => p.children && p.children.includes(nodeId));
    return parent ? parent.id : null;
  };

  // Mobile-specific collision resolution - improved version
  const resolveMobileCollisions = (pages) => {
    // Increased spacing to prevent node/label overlap
    const MIN_NODE_DISTANCE = 140; // Increased from 120 - accounts for node + label height
    const MIN_CROSS_LEVEL_DISTANCE = 140; // Minimum distance between nodes in different columns (increased from 100)
    const updatedPages = [...pages];

    // Group nodes by x-levels (since mobile flows horizontally)
    const xLevels = {};
    updatedPages.forEach(page => {
      const xLevel = Math.round(page.x / 60) * 60; // Round to nearest 60px (was 50)
      if (!xLevels[xLevel]) {
        xLevels[xLevel] = [];
      }
      xLevels[xLevel].push(page);
    });

    // Sort x-levels by position
    const sortedXLevels = Object.keys(xLevels).map(Number).sort((a, b) => a - b);

    // Resolve collisions within each x-level
    sortedXLevels.forEach(xLevel => {
      const levelNodes = xLevels[xLevel];
      if (levelNodes.length <= 1) return;

      // Sort by y position
      levelNodes.sort((a, b) => a.y - b.y);

      // Check for overlaps and fix them
      for (let i = 1; i < levelNodes.length; i++) {
        const prevNode = levelNodes[i - 1];
        const currNode = levelNodes[i];

        const distance = currNode.y - prevNode.y;
        if (distance < MIN_NODE_DISTANCE) {
          // Move current node down to avoid overlap
          const adjustment = MIN_NODE_DISTANCE - distance;
          currNode.y += adjustment;

          // Cascade adjustment to subsequent nodes
          for (let j = i + 1; j < levelNodes.length; j++) {
            if (levelNodes[j].y - levelNodes[j - 1].y < MIN_NODE_DISTANCE) {
              levelNodes[j].y = levelNodes[j - 1].y + MIN_NODE_DISTANCE;
            }
          }
        }
      }
    });

    // Cross-level collision detection (check adjacent columns)
    for (let i = 0; i < sortedXLevels.length - 1; i++) {
      const currentLevelNodes = xLevels[sortedXLevels[i]];
      const nextLevelNodes = xLevels[sortedXLevels[i + 1]];

      if (!nextLevelNodes) continue;

      // Check for diagonal overlaps between adjacent levels
      currentLevelNodes.forEach(currentNode => {
        nextLevelNodes.forEach(nextNode => {
          const dx = Math.abs(nextNode.x - currentNode.x);
          const dy = Math.abs(nextNode.y - currentNode.y);

          // If nodes are too close diagonally, push the next node down
          if (dx < 100 && dy < MIN_CROSS_LEVEL_DISTANCE) {
            const adjustment = MIN_CROSS_LEVEL_DISTANCE - dy;
            if (nextNode.y >= currentNode.y) {
              nextNode.y += adjustment;
            } else {
              nextNode.y -= adjustment;
            }
          }
        });
      });
    }

    return updatedPages;
  };

  const calculateNodePosition = (parentX, parentY, index, siblingCount, viewportWidth) => {
    // Make spacing responsive to viewport width
    const isMobile = viewportWidth < 768; // Mobile breakpoint

    // Node sizing and spacing
    const nodeHeight = isMobile ? 150 : 100; // Accounts for node + label
    const nodeWidth = isMobile ? 100 : 120;
    const levelSpacing = isMobile ? 100 : 140; // Distance between levels

    let baseX, baseY;

    if (isMobile) {
      // Mobile layout: horizontal flow (left to right)
      // For mobile, move right for each level, spread vertically for siblings
      const startY = parentY - ((siblingCount - 1) * nodeHeight) / 2;
      baseX = parentX + levelSpacing;
      baseY = startY + (index * nodeHeight);
    } else {
      // Desktop layout: vertical flow (top to bottom)
      const startX = parentX - ((siblingCount - 1) * nodeWidth) / 2;
      baseX = startX + (index * nodeWidth);
      baseY = parentY + levelSpacing;
    }

    // New node claims its natural position
    // Any colliding nodes will be pushed in setPages via cascadePushNodes
    return { x: baseX, y: baseY };
  };

  // Push nodes that collide with a new position, cascading the push through the tree
  const cascadePushNodes = (pages, newNodeX, newNodeY, newNodeId, viewportWidth) => {
    const isMobile = viewportWidth < 768;
    const nodeHeight = isMobile ? 150 : 100;
    const nodeWidth = isMobile ? 100 : 120;
    const COLLISION_THRESHOLD = isMobile ? 100 : 80; // How close nodes can be before collision

    // Find nodes that collide with the given position
    const findCollidingNode = (x, y, excludeIds = []) => {
      for (const page of pages) {
        if (excludeIds.includes(page.id)) continue;
        const dx = Math.abs(page.x - x);
        const dy = Math.abs(page.y - y);
        // Check if nodes overlap (considering their visual size)
        if (dx < COLLISION_THRESHOLD && dy < COLLISION_THRESHOLD) {
          return page;
        }
      }
      return null;
    };

    // Track which nodes need to be pushed and by how much
    const pushes = new Map(); // nodeId -> { dx, dy }
    const processed = new Set([newNodeId]);

    // Start by checking collision at the new node's position
    let collidingNode = findCollidingNode(newNodeX, newNodeY, [newNodeId]);

    if (!collidingNode) {
      return pages; // No collision, return unchanged
    }

    // Queue of positions to check for cascade
    const queue = [{ x: newNodeX, y: newNodeY, excludeIds: [newNodeId] }];

    while (queue.length > 0) {
      const { x, y, excludeIds } = queue.shift();
      const collider = findCollidingNode(x, y, excludeIds);

      if (!collider || processed.has(collider.id)) continue;

      processed.add(collider.id);

      // Calculate push amount
      const pushAmount = isMobile ? nodeHeight : nodeWidth;
      const newX = isMobile ? collider.x : collider.x + pushAmount;
      const newY = isMobile ? collider.y + pushAmount : collider.y;

      pushes.set(collider.id, {
        dx: newX - collider.x,
        dy: newY - collider.y
      });

      // Check if pushing this node causes another collision
      queue.push({ x: newX, y: newY, excludeIds: [...excludeIds, collider.id] });
    }

    // Apply all pushes
    if (pushes.size === 0) {
      return pages;
    }

    return pages.map(page => {
      const push = pushes.get(page.id);
      if (push) {
        return {
          ...page,
          x: page.x + push.dx,
          y: page.y + push.dy
        };
      }
      return page;
    });
  };

  // Event handlers for page navigation and search
  const handleWikiLinkClick = async (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('/wiki/')) {
        const title = href.replace('/wiki/', '');
        if (!title.startsWith('File:') && !title.startsWith('Category:')) {
          const url = `https://en.wikipedia.org${href}`;
          // Ensure activePage exists before loading new page
          if (activePage) {
            await loadNewPage({ title, url });
          } else {
            // If no active page, treat as initial load
            await loadNewPage({ title, url, isInitialLoad: true });
          }
        }
      }
    }
  };

  // handleInputChange is now simplified - debouncing happens in useWikipediaSearch hook
  const handleInputChange = (e) => {
    setSearchInput(e.target.value);
    // The useWikipediaSearch hook handles debouncing and API calls automatically
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearSearchResults();
    const pageInfo = extractPageTitle(searchInput);
    if (pageInfo) {
      await loadNewPage(pageInfo);
    } else {
      const searchTitle = searchInput.replace(/\s+/g, '_');
      await loadNewPage({ title: searchTitle, url: `https://en.wikipedia.org/wiki/${searchTitle}` });
    }
    setSearchInput('');
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const previousPage = navigationHistory[historyIndex - 1];
      
      // Update wiki content first
      setWikiContent(previousPage.content);
      
      // Update history index
      setHistoryIndex(prev => prev - 1);
      
      // Set active page (only once)
      setActivePage(previousPage);
      
      // Update tree visualization if tree is expanded
      if (!isTreePaneCollapsed) {
        setPages(prevPages => 
          prevPages.map(page => ({
            ...page,
            isActive: page.id === previousPage.id
          }))
        );
      }
    }
  };

  const handleForward = () => {
    if (historyIndex < navigationHistory.length - 1) {
      const nextPage = navigationHistory[historyIndex + 1];
      setWikiContent(nextPage.content);
      setHistoryIndex(prev => prev + 1);
      setActivePage(nextPage);
      
      if (!isTreePaneCollapsed) {
        setPages(prevPages => 
          prevPages.map(page => ({
            ...page,
            isActive: page.id === nextPage.id
          }))
        );
      }
    }
  };

  const handleNodeClick = (page) => {
    // Only update if it's a different page
    if (!activePage || activePage.id !== page.id) {
      setActivePage(page);
      setWikiContent(page.content);
    }
  };

  const handleReset = async () => {
    setPages([]);
    setActivePage(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
    setSearchInput('');
    await loadHomePage();
  };

  const exportTree = () => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    const svgCopy = svgElement.cloneNode(true);
    const svgData = new XMLSerializer().serializeToString(svgCopy);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wikitree.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Use D3's force simulation for splay mode
  const applyForceDirectedLayout = () => {
    if (pages.length === 0) return;

    // Stop any existing simulation before creating a new one
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    setIsAnimating(true);
    
    const links = pages.flatMap(page => 
      page.children.map(childId => ({
        source: page.id,
        target: childId
      }))
    );
  
    // Give initial random positions around the center
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    // Keep existing positions if they're valid
    pages.forEach(page => {
      if (!page.x || !page.y || isNaN(page.x) || isNaN(page.y)) {
        page.x = width/2 + (Math.random() - 0.5) * width/3;
        page.y = height/2 + (Math.random() - 0.5) * height/3;
      }
    });

    
    const simulation = d3.forceSimulation(pages)
    .force('link', d3.forceLink(links).id(d => d.id).distance(150))
    .force('charge', d3.forceManyBody().strength(-1500))
    .force('center', d3.forceCenter(width/2, height/2))
    .force('collide', d3.forceCollide(100))
    .force('x', d3.forceX(width/2).strength(0.1))
    .force('y', d3.forceY(height/2).strength(0.1))
    .alpha(1)
    .alphaDecay(0.01)
    .restart();
    
    // Modify the force simulation for mobile
    if (isMobile) {
      simulation
        .force('x', d3.forceX(height/2).strength(0.1))
        .force('y', d3.forceY(width/2).strength(0.1));
    }
    simulationRef.current = simulation;
    
    simulation.on('tick', () => {
      setPages(simulation.nodes().map(n => ({ ...n })));
      if (simulation.alpha() < 0.01) {
        simulation.stop();
        setIsAnimating(false);
      }
    });
  };

  // Toggle network view panel
  const handleToggleSplay = () => {
    setShowNetworkView(!showNetworkView);
  };

  // const handleTreePaneToggle = () => {
  //   setIsTreePaneCollapsed(prev => !prev);
  // };

  const extractPageTitle = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('wikipedia.org')) {
        const pathParts = urlObj.pathname.split('/');
        const rawTitle = decodeURIComponent(pathParts[pathParts.length - 1]);
        return { 
          title: rawTitle
            .replace(/–/g, '-')
            .replace(/%/g, '%25'),
          url 
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Load a new page into the tree.
  const loadNewPage = async (pageInfo) => {
    setLoading(true);
    try {
      // Fetch content and thumbnail in parallel for better performance
      const { content, thumbnail, redirectInfo } = await loadPageData(pageInfo.title);
      if (!content) {
        setLoading(false);
        return;
      }

      const pageType = await checkPageType(pageInfo.title);
      // Parse "See also" links from the content
      const seeAlsoLinks = parseSeeAlsoLinks(content);
      const shouldAddToTree = pageType !== 'disambiguation' && pageType !== 'image';
      const decodedTitle = decodeURIComponent(pageInfo.title).replace(/_/g, ' ');
      const isRedirect = !!redirectInfo;
      const existingPage = pages.find(p =>
        p.title.toLowerCase() === decodedTitle.toLowerCase()
      );

      if (existingPage) {
        if (
          activePage &&
          activePage.id !== existingPage.id &&
          !activePage.children.includes(existingPage.id) &&
          shouldAddToTree
        ) {
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
            if (activePageIndex !== -1) {
              updatedPages[activePageIndex].children.push(existingPage.id);
            }
            return updatedPages;
          });
        }
        setActivePage(existingPage);
        setWikiContent(existingPage.content);
      } else {
        if (pageInfo.isInitialLoad || shouldAddToTree) {
          const position = pages.length === 0
            ? { x: 50, y: 50 }
            : calculateNodePosition(
                activePage.x,
                activePage.y,
                activePage.children.length,
                activePage.children.length + 1,
                viewport.width
              );
          const newPageId = generateUniqueId();
          const newPage = {
            parent_id: pages.length === 0 ? "0" : activePage.id,
            id: newPageId,
            title: decodedTitle,
            url: pageInfo.url,
            content,
            thumbnail,
            seeAlso: seeAlsoLinks, // Real "See also" links parsed from Wikipedia content
            isRedirect,
            redirectTarget: redirectInfo?.targetTitle || null,
            x: position.x,
            y: position.y,
            children: []
          };

          setPages(prevPages => {
            // First add the new page
            let updatedPages = [...prevPages, newPage];

            // Add parent-child relationship
            if (activePage) {
              const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
              if (activePageIndex !== -1) {
                if (!updatedPages[activePageIndex].children) {
                  updatedPages[activePageIndex].children = [];
                }
                updatedPages[activePageIndex].children.push(newPage.id);
              }
            }

            // Push any colliding nodes (cascade through tree)
            updatedPages = cascadePushNodes(updatedPages, position.x, position.y, newPageId, viewport.width);

            return updatedPages;
          });
          setActivePage(newPage);
          setWikiContent(content);
        } else {
          setWikiContent(content);
        }
      }

      // If in splay mode, re-run the simulation to re-space nodes.
      if (isSplayed) {
        applyForceDirectedLayout();
      }
    } finally {
      setLoading(false);
    }
  };

  // Effect for handling related pages - now uses real "See also" data parsed from Wikipedia content
  // Note: This only computes seeAlsoNodes, it doesn't auto-open network view
  useEffect(() => {
    if (showSeeAlso && activePage) {
      // Use the real seeAlso links from the page object (parsed from Wikipedia HTML)
      const links = activePage.seeAlso || [];

      if (links.length === 0) {
        setSeeAlsoNodes([]);
        return;
      }

      const N = links.length;
      const radius = 150;
      const centerX = activePage.x;
      const centerY = activePage.y;
      const nodes = links.map((link, i) => {
        // Spread nodes in a semicircle around the active page
        let angle = N === 1 ? -Math.PI / 2 : (-Math.PI / 2) + (i / (N - 1)) * Math.PI;
        return {
          id: `seeAlso-${i}-${link.title}`,
          title: link.title,
          url: link.url.startsWith("http") ? link.url : `https://en.wikipedia.org${link.url}`,
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          isSuggested: true
        };
      });
      setSeeAlsoNodes(nodes);
    } else {
      setSeeAlsoNodes([]);
    }
  }, [showSeeAlso, activePage]);

  // Update the navigation history effect
  useEffect(() => {
    // Only update navigation history if we have an active page and it's different from current
    if (activePage && (navigationHistory[historyIndex]?.id !== activePage.id)) {
      setNavigationHistory(prev => [...prev.slice(0, historyIndex + 1), activePage]);
      setHistoryIndex(prev => prev + 1);
      
      // Ensure content is set regardless of tree pane state
      setWikiContent(activePage.content);
    }
  }, [activePage, historyIndex, navigationHistory]);

  // Rendering functions
  const renderEdges = () => {
    const renderedKeys = new Set();
    
    return pages.flatMap(page =>
      page.children.map(childId => {
        const child = pages.find(p => p.id === childId);
        if (!child) return null;
        
        const edgeKey = `edge-${page.id}-to-${childId}`;
        if (renderedKeys.has(edgeKey)) return null;
        renderedKeys.add(edgeKey);
        
        return (
          <EdgeComponent 
            key={edgeKey}
            startX={page.x} 
            startY={page.y} 
            endX={child.x} 
            endY={child.y}
            isMobile={isMobile} 
          />
        );
      }).filter(Boolean)
    );
  };

  const renderSeeAlsoEdges = () => {
    if (!activePage) return null;
    return seeAlsoNodes.map(node => (
      <EdgeComponent 
        key={`edge-see-also-${node.id}-to-${activePage.id}`}
        startX={activePage.x} 
        startY={activePage.y} 
        endX={node.x} 
        endY={node.y}
        isMobile={isMobile} 
        suggested={true} 
      />
    ));
  };

  const renderSeeAlsoNodes = () => {
    return seeAlsoNodes.map(node => (
      <NodeComponent 
        key={node.id} 
        x={node.x} 
        y={node.y} 
        title={node.title} 
        suggested={true}
        isMobile={isMobile}
        onClick={() => {
          loadNewPage({ title: node.title, url: node.url });
          setSeeAlsoNodes([]);
        }} 
      />
    ));
  };

  const HeaderComponent = ({ scrollY, handleReset, isMobile, isTreePaneCollapsed }) => (
    <div 
      className={`sticky top-0 z-30 flex items-center justify-between p-4 border-b bg-white/90 backdrop-blur-sm shadow-sm ${
        isTreePaneCollapsed ? 'h-16' : ''
      }`}
      style={{ 
        height: !isTreePaneCollapsed ? (scrollY > 0 ? '3rem' : '6rem') : undefined,
        minHeight: '3rem'
      }}
    >
      <img
        src="/wikirabbit_transparent.svg"
        alt="WikiRabbit - Click to go home"
        className="h-full w-auto p-2 toolbar-button transition-all duration-200 cursor-pointer hover:opacity-80"
        onClick={handleReset}
        title="Go to Home Page"
      />
      {isTreePaneCollapsed && (
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="toolbar-button" 
            title="Reset Tree"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );

  const SearchComponent = ({ handleBack, historyIndex, handleSubmit, searchInput, handleInputChange, searchResults, loadNewPage }) => (
    <div className="flex items-center px-4 mb-4 relative z-[01]">
      <button
        onClick={handleBack}
        disabled={historyIndex <= 0}
        className={`mr-4 p-2 rounded-full shadow transition-all duration-200 ${
          historyIndex <= 0
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
        }`}
      >
        <ArrowLeft size={20} />
      </button>
      <form onSubmit={handleSubmit} className="flex-grow mr-4">
        {/* ... rest of search form code ... */}
      </form>
    </div>
  );


  
  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-screen bg-slate-50 ${isMobile ? 'safe-area-pt' : ''}`}
      {...(isMobile ? bindRefresh : {})}
    >
      {/* Styles are now in src/styles/wikiContent.css (imported via index.css) */}

      {/* Pull to Refresh Indicator */}
      {isMobile && (
        <PullToRefresh 
          pullDistance={pullDistance}
          isRefreshing={isPullRefreshing}
        />
      )}
      
      
      <div className={`flex flex-1 min-h-0 ${isMobile ? 'flex-col pt-16' : ''} overflow-hidden`}>
        {/* Left/Top pane: Graph view */}
        <div 
        className="relative gradient-bg border-r border-gray-200" 
        style={{
          width: getTreePaneWidth(),
          height: isMobile
            ? treePaneMode === 'collapsed'
              ? '0.5rem'
              : '21%'
            : '100%',
          transition: 'all 0.3s ease-in-out',
          position: 'relative',
        }}
        >
        {/* Add CollapseButton here */}
        <CollapseButton
          mode={treePaneMode}
          onClick={handleTreePaneToggle}
          isMobile={isMobile}
        />


          {/* Only render tree content when not collapsed */}
          {/* Header - hidden on mobile */}
          {!isMobile && (
          <div 
            className="sticky top-0 z-30 flex items-center justify-between p-4 border-b bg-white/90 backdrop-blur-sm shadow-sm" 
            style={{ 
              height: scrollY > 0 ? '3rem' : '6rem',
              minHeight: '3rem'
            }}
          >
            <img
              src="/wikirabbit_transparent.svg"
              alt="WikiRabbit - Click to go home"
              className="h-full w-auto p-2 toolbar-button transition-all duration-200 cursor-pointer hover:opacity-80"
              onClick={handleReset}
              title="Go to Home Page"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="toolbar-button" 
                title="Reset Tree"
              >
                Reset
              </button>
              <button
                onClick={handleFitGraph}
                className="toolbar-button"
                title="Fit to View"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Frame corners */}
                  <path d="M3 3h4v4" />
                  <path d="M3 21h4v-4" />
                  <path d="M21 3h-4v4" />
                  <path d="M21 21h-4v-4" />
                  {/* Center dot */}
                  <circle cx="12" cy="12" r="1" fill="currentColor" />
                </svg>
              </button>
              <button
                onClick={handleToggleSplay}
                className={`toolbar-button ${showNetworkView ? 'active' : ''}`}
                title="Network View"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Network/Graph icon */}
                  <circle cx="12" cy="5" r="3" />
                  <circle cx="5" cy="19" r="3" />
                  <circle cx="19" cy="19" r="3" />
                  <line x1="12" y1="8" x2="5" y2="16" />
                  <line x1="12" y1="8" x2="19" y2="16" />
                  <line x1="8" y1="19" x2="16" y2="19" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setShowSeeAlso(prev => {
                    const newValue = !prev;
                    // Open network view shelf when enabling related pages
                    if (newValue && !isSplayed) {
                      setIsSplayed(true);
                    }
                    return newValue;
                  });
                }}
                className={`toolbar-button ${showSeeAlso ? 'active' : ''}`}
                title="Toggle Related Pages"
              >
                <NetworkNodesIcon size={20} />
              </button>
              <button
                onClick={() => setShowRabbitHole(true)}
                className={`toolbar-button ${showRabbitHole ? 'active' : ''}`}
                title="Rabbit Hole - Deep Analysis"
              >
                <Rabbit size={20} />
              </button>
              <button
                onClick={handleShare}
                className="toolbar-button"
                title="Share Tree"
              >
                <Share2 size={20} />
              </button>
              <button
                onClick={exportTree}
                className="toolbar-button"
                title="Export Tree"
              >
                <Download size={20} />
              </button>
            </div>
          </div>
          )}

{/* svgGraph */}

          {/* Tree content */}
          {!isTreePaneCollapsed && (
            <div className="h-full flex flex-col">
              {/* Graph SVG container */}
              <div className="flex-1 overflow-hidden">
                <svg 
                  ref={svgRef} 
                  width="100%" 
                  height="100%" 
                  onWheel={handleWheel} 
                  onMouseDown={handleMouseDown}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => lastPinchDistance.current = null}
                  style={{ 
                    cursor: isDragging ? 'grabbing' : 'grab',
                    fontSize: isMobile ? '0.6rem' : 'inherit',
                    touchAction: isMobile ? 'pan-x pan-y' : 'none'
                  }}
                  className="transition-all duration-200"
                >
                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {renderEdges()}
                    {renderSeeAlsoEdges()}
                    {pages.map(page => (
                      page.isRedirect ? (
                        <RedirectNodeComponent
                          key={page.id}
                          x={page.x}
                          y={page.y}
                          title={page.title}
                          redirectTarget={page.redirectTarget}
                          isActive={activePage && page.id === activePage.id}
                          isMobile={isMobile}
                          onClick={() => handleNodeClick(page)}
                        />
                      ) : (
                        <NodeComponent
                          key={page.id}
                          x={page.x}
                          y={page.y}
                          title={page.title}
                          thumbnail={page.thumbnail}
                          isActive={activePage && page.id === activePage.id}
                          isMobile={isMobile}
                          onClick={() => handleNodeClick(page)}
                        />
                      )
                    ))}
                    {renderSeeAlsoNodes()}
                  </g>

                </svg>
              </div>
  
              <TreeControls 
                onFit={handleFitGraph}
                horizontalSpread={horizontalSpread}
                setHorizontalSpread={setHorizontalSpread}
              />
            </div>
          )}
        </div>
  
        {/* Resizer - only show on desktop */}
        {!isMobile && <Resizer onMouseDown={handleResizeStart} />}
  
        {/* Right/Bottom pane: Content view */}
        <div 
          className="flex-1 flex flex-col bg-white overflow-auto"
          style={{ 
            height: isMobile 
              ? isTreePaneCollapsed 
                ? 'calc(100% - 4rem)'  // Adjust for top nav height
                : 'calc(79% - 4rem)' // 79% height minus top nav
              : '100%',
            minWidth: isMobile ? 'unset' : '400px',
            transition: 'all 0.3s ease-in-out'
          }}
        >


          
            <div
              className={`transition-all duration-300 ease-in-out ${
                isMobile
                  ? isSearchBarVisible
                    ? 'h-auto opacity-100'
                    : 'h-0 opacity-0 overflow-hidden'
                  : ''
              }`}
              style={{
                position: isMobile ? 'sticky' : 'static',
                top: isMobile ? '0' : 'auto',
                zIndex: isMobile ? '50' : 'auto',
                backgroundColor: isMobile ? 'white' : 'transparent'
              }}
            >
              <NavigationBar
                handleBack={handleBack}
                handleForward={handleForward}
                historyIndex={historyIndex}
                navigationHistory={navigationHistory}
                handleSubmit={handleSubmit}
                searchInput={searchInput}
                handleInputChange={handleInputChange}
                searchResults={searchResults}
                isSearchLoading={isSearchLoading}
                loadNewPage={loadNewPage}
                setSearchInput={setSearchInput}
                clearSearchResults={clearSearchResults}
              />
            </div>
  
          {/* Wiki content */}
          <div 
            className={`flex-1 overflow-auto bg-white ${isMobile ? 'mx-0 mb-0 border-t' : 'mx-4 mb-1 border rounded-lg shadow-sm'}`}
            onClick={handleWikiLinkClick}
            onTouchStart={handleTouchStartSwipe}
            onTouchEnd={handleTouchEndSwipe}
            onScroll={handleWikiScroll}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-xl text-gray-600 animate-pulse">Loading...</div>
              </div>
            ) : (
              <div 
                dangerouslySetInnerHTML={{ __html: wikiContent }} 
                className={`wiki-content prose max-w-none ${isMobile ? 'p-2' : 'p-4'}`} 
              />
            )}
          </div>
        </div>
      </div>
  
      {/* Footer */}
      <div className="w-full bg-white border-t py-1 px-4 flex justify-center items-center">
        <a 
          href="https://github.com/whosawme/wikinav" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors" 
          title="View on GitHub"
        >
          <Github size={20} />
        </a>
        <a
          href="https://discord.gg/MquePtjtB6"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Discord size={20} />
        </a>
      </div>
      
      {/* Network View Panel */}
      <NetworkViewPanel
        isOpen={showNetworkView}
        onClose={() => setShowNetworkView(false)}
        pages={pages}
        activePage={activePage}
      />

      {/* Rabbit Hole Analysis Panel */}
      <RabbitHoleShelf
        isOpen={showRabbitHole}
        onClose={() => setShowRabbitHole(false)}
        currentPage={activePage}
        onLoadPage={loadNewPage}
        loadPageData={loadPageData}
      />

      {isLoadingShared && <LoadingBunny />}
      
      {/* Mobile Scroll Hints */}
      {isMobile && (
        <MobileScrollHints
          pan={pan}
          panLimits={panLimits}
          zoom={zoom}
        />
      )}
      
      {/* Mobile Top Navigation */}
      {isMobile && (
        <MobileBottomNav
          onBack={handleBack}
          onHome={handleReset}
          onNetworkView={handleToggleSplay}
          onShare={handleShare}
          onMenu={() => handleTreePaneToggle()}
          onReset={handleReset}
          onFitGraph={handleFitGraph}
          onExport={exportTree}
          onRabbitHole={() => setShowRabbitHole(true)}
          canGoBack={historyIndex > 0}
          showNetworkView={showNetworkView}
          showRabbitHole={showRabbitHole}
        />
      )}
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
};

export default WikiNavTree;