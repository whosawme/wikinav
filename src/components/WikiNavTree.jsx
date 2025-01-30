import React, { useState, useEffect, useRef } from 'react';

// Node component remains the same
const Node = ({ x, y, title, isActive, onClick }) => (
  <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <circle 
      r="20" 
      fill={isActive ? '#3B82F6' : '#fff'} 
      stroke="#000" 
      strokeWidth="2"
    />
    <text 
      textAnchor="middle" 
      dy="40"
      className={`text-sm ${isActive ? 'font-bold' : ''}`}
    >
      <tspan x="0" dy="0">{title.length > 20 ? title.slice(0, 20) + '...' : title}</tspan>
    </text>
  </g>
);

// Edge component remains the same
const Edge = ({ startX, startY, endX, endY }) => (
  <line 
    x1={startX} 
    y1={startY} 
    x2={endX} 
    y2={endY} 
    stroke="#666" 
    strokeWidth="2"
  />
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
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [leftPaneWidth, setLeftPaneWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

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

  // Handle resizing
  const handleResizeStart = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleResizeMove = (e) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = e.clientX - containerRect.left;
      setLeftPaneWidth(Math.max(200, Math.min(newWidth, window.innerWidth - 400)));
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  // Load Wikipedia home page on component mount
  useEffect(() => {
    const loadHomePage = async () => {
      const content = await fetchWikiContent('Main_Page');
      if (content) {
        const homePage = {
          id: '1',
          title: 'Main Page',
          url: 'https://en.wikipedia.org/wiki/Main_Page',
          content,
          x: 200,
          y: 50,
          children: []
        };
        setPages([homePage]);
        setActivePage(homePage);
        setWikiContent(content);
      }
    };
    loadHomePage();
  }, []);

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

  // Handle form submission
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
      // Handle as search term - load first result
      const results = await searchWikipedia(searchInput);
      if (results.length > 0) {
        const firstResult = results[0];
        await loadNewPage({
          title: firstResult.title,
          url: firstResult.url
        });
      }
    }
    
    setSearchInput('');
  };

  // Mouse interaction handlers for pan and zoom
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

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle node click
  const handleNodeClick = (page) => {
    setActivePage(page);
    setWikiContent(page.content);
  };

  // Handle wiki link clicks
  const handleWikiLinkClick = async (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('/wiki/')) {
        const title = href.replace('/wiki/', '');
        const url = `https://en.wikipedia.org${href}`;
        await loadNewPage({ title, url });
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
      // Check if this page already exists in the tree
      const existingPage = pages.find(p => 
        p.title.toLowerCase() === pageInfo.title.replace(/_/g, ' ').toLowerCase()
      );

      if (existingPage) {
        // If we're coming from a different page, add the new connection
        if (activePage && activePage.id !== existingPage.id && 
            !activePage.children.includes(existingPage.id)) {
          setPages(prevPages => {
            const updatedPages = [...prevPages];
            const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
            if (activePageIndex !== -1) {
              updatedPages[activePageIndex].children.push(existingPage.id);
            }
            return updatedPages;
          });
        }
        // Switch to the existing page
        setActivePage(existingPage);
        setWikiContent(content);
      } else {
        // Create new page if it doesn't exist
        const position = pages.length === 0 
          ? { x: 200, y: 50 }
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
      }
    }
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

  // Modified render method
  return (
    <div 
      ref={containerRef}
      className="flex h-screen"
      onMouseMove={handleResizeMove}
      onMouseUp={handleResizeEnd}
    >
      {/* Navigation Graph */}
      <div 
        className="h-full border-r bg-white"
        style={{ width: `${leftPaneWidth}px` }}
      >
        <div className="h-full flex flex-col">
          <h2 className="text-xl font-bold p-4">Navigation History</h2>
          <div className="flex-1 overflow-hidden">
            <svg
              width="100%"
              height="100%"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
      <div className="flex-1 flex flex-col p-4 min-w-[400px]">
        {/* Search/URL Input */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={handleInputChange}
              placeholder="Enter Wikipedia URL or search term..."
              className="w-full p-2 border rounded"
            />
            {searchResults.length > 0 && (
              <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={async () => {
                      await loadNewPage({
                        title: result.title,
                        url: result.url
                      });
                      setSearchInput('');
                      setSearchResults([]);
                    }}
                  >
                    <div className="font-medium">{result.title}</div>
                    <div className="text-sm text-gray-600">{result.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Content Viewer */}
        <div className="flex-1 border rounded p-4 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xl">Loading...</div>
            </div>
          ) : (
            <div 
              onClick={handleWikiLinkClick}
              dangerouslySetInnerHTML={{ __html: wikiContent }}
              className="wiki-content"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WikiNavTree;