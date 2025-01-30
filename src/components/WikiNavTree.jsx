import React, { useState, useEffect, useRef } from 'react';

// Node component remains the same
// Style customization for Wikipedia content
const styles = `
  .wiki-content {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  .wiki-content a {
    color: #2563eb;
    text-decoration: none;
    transition: all 0.2s;
  }
  .wiki-content a:hover {
    color: #1d4ed8;
    text-decoration: underline;
  }
  .wiki-content table {
    border-collapse: collapse;
    margin: 1em 0;
  }
  .wiki-content th, .wiki-content td {
    border: 1px solid #e5e7eb;
    padding: 0.5em;
  }
  .wiki-content th {
    background-color: #f3f4f6;
  }
  .wiki-content img {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
  }
  .wiki-content h1, .wiki-content h2, .wiki-content h3 {
    color: #1f2937;
    font-weight: 600;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  .wiki-content p {
    line-height: 1.6;
    margin-bottom: 1em;
    color: #374151;
  }
  .wiki-content ul, .wiki-content ol {
    margin: 1em 0;
    padding-left: 1.5em;
  }
  .wiki-content li {
    margin: 0.5em 0;
  }
  .wiki-content blockquote {
    border-left: 4px solid #e5e7eb;
    padding-left: 1em;
    margin: 1em 0;
    color: #4b5563;
  }
`;

const Node = ({ x, y, title, isActive, onClick }) => (
  <g 
    transform={`translate(${x},${y})`} 
    onClick={onClick} 
    style={{ cursor: 'pointer' }}
    className="transition-transform duration-200 ease-in-out"
  >
    <circle 
      r="20" 
      fill={isActive ? '#3B82F6' : '#fff'} 
      stroke={isActive ? '#1E40AF' : '#000'}
      strokeWidth="2"
      className="transition-all duration-200 ease-in-out shadow-lg"
    />
    <text 
      textAnchor="middle" 
      dy="40"
      className={`text-sm ${isActive ? 'font-bold fill-blue-600' : 'fill-gray-700'} transition-all duration-200`}
    >
      <tspan x="0" dy="0">{title.length > 20 ? title.slice(0, 20) + '...' : title}</tspan>
    </text>
  </g>
);

// Edge component remains the same
const Edge = ({ startX, startY, endX, endY }) => (
  <g>
    <defs>
      <marker
        id="arrowhead"
        markerWidth="10"
        markerHeight="7"
        refX="9"
        refY="3.5"
        orient="auto"
      >
        <polygon
          points="0 0, 10 3.5, 0 7"
          fill="#4B5563"
          className="transition-colors duration-200"
        />
      </marker>
    </defs>
    <line 
      x1={startX} 
      y1={startY} 
      x2={endX} 
      y2={endY} 
      stroke="#4B5563" 
      strokeWidth="2"
      markerEnd="url(#arrowhead)"
      className="transition-all duration-200"
    />
  </g>
);

// Resizer component
const Resizer = ({ onMouseDown }) => (
  <div
    className="w-2 cursor-col-resize bg-gray-200 hover:bg-gray-300 active:bg-gray-400"
    onMouseDown={onMouseDown}
  />
);

const WikiNavTree = () => {
  // Set document title on component mount
  useEffect(() => {
    document.title = 'WikiNav';
  }, []);

  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [wikiContent, setWikiContent] = useState('');
  const [loading, setLoading] = useState(true);  // Start with loading state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [leftPaneWidth, setLeftPaneWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const svgRef = useRef(null);

  // Load homepage content but don't add to tree
  useEffect(() => {
    const fetchHomePage = async () => {
      try {
        const response = await fetch(
          `https://en.wikipedia.org/w/api.php?` +
          `action=parse&` +
          `page=Main_Page&` +
          `format=json&` +
          `origin=*&` +
          `prop=text`
        );
        const data = await response.json();
        if (data.parse && data.parse.text) {
          setWikiContent(data.parse.text['*']);
        }
      } catch (error) {
        console.error('Error loading homepage:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomePage();
  }, []);

  // Navigation history
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Function to check if a Wikipedia page is a disambiguation or image page
  const checkPageType = async (title) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?` +
        `action=query&` +
        `prop=categories|pageprops&` +
        `titles=${encodeURIComponent(title)}&` +
        `format=json&` +
        `origin=*`
      );
      const data = await response.json();
      const page = Object.values(data.query.pages)[0];
      
      // Check for disambiguation pages
      if (page.pageprops && page.pageprops.disambiguation !== undefined) {
        return 'disambiguation';
      }
      
      // Check for image/file pages
      if (page.categories) {
        const isImagePage = page.categories.some(cat => 
          cat.title.includes('Image:') || 
          cat.title.includes('File:') ||
          cat.title.includes('Category:Images')
        );
        if (isImagePage) return 'image';
      }
      
      return 'article';
    } catch (error) {
      console.error('Error checking page type:', error);
      return 'unknown';
    }
  };

  // Function to find graph boundaries
  const getGraphBoundaries = () => {
    if (pages.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    
    return pages.reduce((bounds, page) => ({
      minX: Math.min(bounds.minX, page.x - 50),  // Add padding for nodes
      maxX: Math.max(bounds.maxX, page.x + 50),
      minY: Math.min(bounds.minY, page.y - 50),
      maxY: Math.max(bounds.maxY, page.y + 50)
    }), {
      minX: pages[0].x,
      maxX: pages[0].x,
      minY: pages[0].y,
      maxY: pages[0].y
    });
  };

  // Function to fit graph to view
  const handleFitGraph = () => {
    if (svgRef.current && pages.length > 0) {
      const svg = svgRef.current;
      const bounds = getGraphBoundaries();
      const padding = 50;  // Padding from edges
      
      const svgWidth = svg.clientWidth - (padding * 2);
      const svgHeight = svg.clientHeight - (padding * 2);
      const graphWidth = bounds.maxX - bounds.minX;
      const graphHeight = bounds.maxY - bounds.minY;
      
      const scale = Math.min(
        svgWidth / graphWidth,
        svgHeight / graphHeight,
        1.5  // Maximum zoom out
      );
      
      setZoom(scale);
      setPan({
        x: (svgWidth / 2) - ((bounds.minX + graphWidth / 2) * scale) + padding,
        y: (svgHeight / 2) - ((bounds.minY + graphHeight / 2) * scale) + padding
      });
    }
  };

  // Function to center graph
  const handleCenterGraph = () => {
    if (pages.length > 0) {
      const rootNode = pages[0];
      setPan({
        x: 50,  // Position root node at left edge with small padding
        y: 50   // Position at top with small padding
      });
      setZoom(1);
    }
  };

  // Add global mouse handlers
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    const handleGlobalMouseMove = (e) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
        });
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

  // Handle wheel zoom
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(z => Math.min(Math.max(0.5, z + delta), 2));
    }
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click only
      setIsDragging(true);
      setDragStart({ 
        x: e.clientX - pan.x, 
        y: e.clientY - pan.y 
      });
    }
  };

  // Handle resizing
  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  // Handle node click
  const handleNodeClick = (page) => {
    setActivePage(page);
    setWikiContent(page.content);
  };

  // Handle back navigation
  const handleBack = () => {
    if (historyIndex > 0) {
      const previousPage = navigationHistory[historyIndex - 1];
      setActivePage(previousPage);
      setWikiContent(previousPage.content);
      setHistoryIndex(prev => prev - 1);
    }
  };

  // Update history when active page changes
  useEffect(() => {
    if (activePage && (navigationHistory[historyIndex]?.id !== activePage.id)) {
      setNavigationHistory(prev => [...prev.slice(0, historyIndex + 1), activePage]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [activePage]);

  // Function to search Wikipedia
  const searchWikipedia = async (query) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?` +
        `action=opensearch&` +
        `search=${encodeURIComponent(query)}&` +
        `format=json&` +
        `origin=*`
      );
      const [term, titles, descriptions, urls] = await response.json();
      return titles.map((title, i) => ({
        title,
        description: descriptions[i],
        url: urls[i]
      }));
    } catch (error) {
      console.error('Error searching Wikipedia:', error);
      return [];
    }
  };

  // Function to fetch Wikipedia content
  const fetchWikiContent = async (title) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?` +
        `action=parse&` +
        `page=${encodeURIComponent(title)}&` +
        `format=json&` +
        `origin=*&` +
        `prop=text`
      );
      const data = await response.json();
      if (data.parse && data.parse.text) {
        return data.parse.text['*'];
      }
      throw new Error('Failed to fetch Wikipedia content');
    } catch (error) {
      console.error('Error fetching Wikipedia content:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = async (e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (value.trim() && !value.startsWith('http')) {
      const results = await searchWikipedia(value);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  // Extract page title from Wikipedia URL
  const extractPageTitle = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('wikipedia.org')) {
        const pathParts = urlObj.pathname.split('/');
        return {
          title: decodeURIComponent(pathParts[pathParts.length - 1]),
          url: url
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  // Handle wiki link clicks
  const handleWikiLinkClick = async (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('/wiki/')) {
        const title = href.replace('/wiki/', '');
        // Don't navigate to File: or Category: pages
        if (!title.startsWith('File:') && !title.startsWith('Category:')) {
          const url = `https://en.wikipedia.org${href}`;
          await loadNewPage({ title, url });
        }
      }
    }
  };

  // Calculate node position
  const calculateNodePosition = (parentX, parentY, index, siblingCount) => {
    const levelSpacing = 120;  // Vertical space between levels
    const nodeSpacing = 100;   // Horizontal space between siblings
    const totalWidth = (siblingCount - 1) * nodeSpacing;
    
    // Calculate x position spreading siblings evenly
    const x = parentX - totalWidth/2 + (index * nodeSpacing);
    // Y position is fixed distance below parent
    const y = parentY + levelSpacing;
    
    return { x, y };
  };

  // Load new page
  const loadNewPage = async (pageInfo) => {
    const content = await fetchWikiContent(pageInfo.title);
    if (content) {
      // Check page type
      const pageType = await checkPageType(pageInfo.title);
      const shouldAddToTree = pageType !== 'disambiguation' && pageType !== 'image';
      
      // Check if this page already exists in the tree
      const existingPage = pages.find(p => 
        p.title.toLowerCase() === pageInfo.title.replace(/_/g, ' ').toLowerCase()
      );

      if (existingPage) {
        // If we're coming from a different page and it's not a special page type,
        // add the new connection
        if (activePage && activePage.id !== existingPage.id && 
            !activePage.children.includes(existingPage.id) && shouldAddToTree) {
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
            if (activePageIndex !== -1) {
              updatedPages[activePageIndex].children.push(existingPage.id);
            }
            return updatedPages;
          });
        }
        // Switch to the existing page regardless of type
        setActivePage(existingPage);
        setWikiContent(existingPage.content);
      } else {
        // For initial load or regular articles, add to the tree
        if (pageInfo.isInitialLoad || shouldAddToTree) {
          const position = pages.length === 0 
            ? { x: 50, y: 50 }  // Start root node on left side
            : calculateNodePosition(
                activePage.x, 
                activePage.y, 
                activePage.children.length,
                activePage.children.length + 1
              );

          const newPage = {
            id: String(pages.length + 1),
            title: pageInfo.title.replace(/_/g, ' '),
            url: pageInfo.url,
            content,
            x: position.x,
            y: position.y,
            children: []
          };
          
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            if (activePage) {
              const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
              if (activePageIndex !== -1) {
                updatedPages[activePageIndex].children.push(newPage.id);
              }
            }
            return [...updatedPages, newPage];
          });
          setActivePage(newPage);
          setWikiContent(content);
        } else {
          // For disambiguation/image pages, just show the content without adding to tree
          setWikiContent(content);
        }
      }
    }
  };

  // Handle search input submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear search results
    setSearchResults([]);
    
    // Check if input is a URL
    const pageInfo = extractPageTitle(searchInput);
    
    if (pageInfo) {
      // Handle URL directly
      await loadNewPage(pageInfo);
    } else {
      // Load the search term directly instead of auto-selecting first result
      const searchTitle = searchInput.replace(/\s+/g, '_');
      await loadNewPage({
        title: searchTitle,
        url: `https://en.wikipedia.org/wiki/${searchTitle}`
      });
    }
    
    setSearchInput('');
  };

  // Render edges between connected nodes
  const renderEdges = () => {
    return pages.flatMap(page => 
      page.children.map(childId => {
        const child = pages.find(p => p.id === childId);
        return child ? (
          <Edge 
            key={`${page.id}-${childId}`}
            startX={page.x}
            startY={page.y}
            endX={child.x}
            endY={child.y}
          />
        ) : null;
      })
    );
  };

  return (
    <div ref={containerRef} className="flex h-screen bg-gray-50">
      <style>{styles}</style>
      {/* Navigation Graph */}
      <div 
        className="h-full border-r bg-gradient-to-br from-white to-blue-50"
        style={{ width: `${leftPaneWidth}px` }}
      >
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-bold p-4 bg-white border-b shadow-sm">
            Navigation History
          </h2>
          <div className="flex-1 overflow-hidden">
            <svg
              ref={svgRef}
              width="100%"
              height="100%"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              className="transition-all duration-200"
            >
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {renderEdges()}
                {pages.map(page => (
                  <Node
                    key={page.id}
                    x={page.x}
                    y={page.y}
                    title={page.title}
                    isActive={activePage && page.id === activePage.id}
                    onClick={() => handleNodeClick(page)}
                  />
                ))}
              </g>
            </svg>
          </div>
        </div>
      </div>

      {/* Resizer */}
      <Resizer onMouseDown={handleResizeStart} />

      {/* Content Area */}
      <div className="flex-1 flex flex-col p-4 min-w-[400px] bg-white">
        {/* Navigation Controls */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleBack}
            disabled={historyIndex <= 0}
            className={`px-4 py-2 rounded-lg shadow transition-all duration-200 ${
              historyIndex <= 0 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'
            }`}
          >
            Back
          </button>
          <button
            onClick={handleCenterGraph}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200"
          >
            Center Graph
          </button>
          <button
            onClick={handleFitGraph}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200"
          >
            Fit Graph
          </button>
        </div>

        {/* Search/URL Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Enter Wikipedia URL or search term..."
              className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200"
            />
            {searchResults.length > 0 && (
              <div className="absolute w-full mt-2 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 border-b last:border-b-0"
                    onClick={async () => {
                      await loadNewPage({
                        title: result.title,
                        url: result.url
                      });
                      setSearchInput('');
                      setSearchResults([]);
                    }}
                  >
                    <div className="font-medium text-gray-900">{result.title}</div>
                    <div className="text-sm text-gray-600 mt-1">{result.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Content Viewer */}
        <div className="flex-1 border rounded-lg shadow-sm p-4 overflow-auto bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xl text-gray-600 animate-pulse">Loading...</div>
            </div>
          ) : (
            <div 
              onClick={handleWikiLinkClick}
              dangerouslySetInnerHTML={{ __html: wikiContent }}
              className="wiki-content prose max-w-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WikiNavTree;