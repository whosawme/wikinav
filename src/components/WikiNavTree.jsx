import React, { useState, useEffect } from 'react';

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

const WikiNavTree = () => {
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [wikiContent, setWikiContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  // Handle zoom with mouse wheel
  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setZoom(z => Math.min(Math.max(0.5, z + delta), 2));
    }
  };

  // Handle pan with mouse drag
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

  // Function to extract page title from Wikipedia URL
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
      throw new Error('Not a Wikipedia URL');
    } catch (e) {
      alert('Please enter a valid Wikipedia URL');
      return null;
    }
  };

  // Handle internal link clicks
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

    // Modified loadNewPage function to handle revisits
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
            setWikiContent(existingPage.content);
          } else {
            // Create new page if it doesn't exist
            if (pages.length === 0) {
              // Create first node
              const newPage = {
                id: '1',
                title: pageInfo.title.replace(/_/g, ' '),
                url: pageInfo.url,
                content,
                x: 200,
                y: 50,
                children: []
              };
              setPages([newPage]);
              setActivePage(newPage);
              setWikiContent(content);
            } else {
              // Calculate position considering all connected nodes
              const connectedNodes = activePage.children.length;
              const position = calculateNodePosition(
                activePage.x, 
                activePage.y, 
                connectedNodes,
                connectedNodes + 1
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
                const activePageIndex = updatedPages.findIndex(p => p.id === activePage.id);
                if (activePageIndex !== -1) {
                  updatedPages[activePageIndex].children.push(newPage.id);
                }
                return [...updatedPages, newPage];
              });
              setActivePage(newPage);
              setWikiContent(content);
            }
          }
        }
      };

  // Handle URL submission
  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    const pageInfo = extractPageTitle(urlInput);
    if (pageInfo) {
      await loadNewPage(pageInfo);
      setUrlInput('');
    }
  };

  // Handle clicking on Wikipedia home page link
  const handleHomePageClick = () => {
    setUrlInput('https://en.wikipedia.org/wiki/Main_Page');
  };

  // Handle node click
  const handleNodeClick = (page) => {
    setActivePage(page);
    setWikiContent(page.content);
  };

// Modified renderEdges to show all connections
  const renderEdges = () => {
    const edges = [];
    pages.forEach(page => {
      page.children.forEach(childId => {
        const child = pages.find(p => p.id === childId);
        if (child) {
          edges.push(
            <Edge 
              key={`${page.id}-${childId}`}
              startX={page.x}
              startY={page.y}
              endX={child.x}
              endY={child.y}
            />
          );
        }
      });
    });
    return edges;
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen">
      {/* Navigation Graph */}
      <div className="w-1/3 p-4 border-r">
        <h2 className="text-xl font-bold mb-4">Navigation History</h2>
        <div 
          className="border rounded bg-gray-50 overflow-hidden"
          style={{ width: '400px', height: '600px' }}
          onWheel={handleWheel}
        >
          <svg
            width="400"
            height="600"
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

      {/* Wikipedia Content Viewer */}
      <div className="w-2/3 p-4 flex flex-col">
        <form onSubmit={handleUrlSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter Wikipedia URL..."
              className="flex-1 p-2 border rounded"
              required
            />
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Load
            </button>
          </div>
        </form>

        <div className="mb-4">
          <button
            onClick={handleHomePageClick}
            className="text-blue-500 hover:underline"
          >
            Load Wikipedia Home Page
          </button>
        </div>
        
        <div className="flex-1 border rounded p-4 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-xl">Loading...</div>
            </div>
          ) : activePage ? (
            <div 
              onClick={handleWikiLinkClick}
              dangerouslySetInnerHTML={{ __html: wikiContent }}
              className="wiki-content"
            />
          ) : (
            <div className="text-gray-500">
              Enter a Wikipedia URL above or click "Load Wikipedia Home Page" to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WikiNavTree;