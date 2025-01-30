import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';

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
  const svgRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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

  const treeLayout = d3.tree().nodeSize([150, 200]);

  const updateGraph = () => {
    if (pages.length === 0) return;

    const rootData = pages.find(page => !page.parent);
    if (!rootData) {
      console.error("No root node found in the page data.");
      return;
    }

    const root = d3.hierarchy(rootData, (d) => {
      return pages.filter(page => page.parent === d.id);
    });

    treeLayout(root);
    const nodes = root.descendants();

    setPages(prevPages => {
      return prevPages.map(page => {
        const correspondingNode = nodes.find(node => node.data.id === page.id);
        return correspondingNode ? { ...page, x: correspondingNode.x, y: correspondingNode.y } : page;
      });
    });
  };

  useEffect(() => {
    updateGraph();
  }, [pages]);

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

  const loadNewPage = async (pageInfo) => {
    const content = await fetchWikiContent(pageInfo.title);
    if (content) {
      const existingPage = pages.find(p =>
        p.title.toLowerCase() === pageInfo.title.replace(/_/g, ' ').toLowerCase()
      );
  
      if (existingPage) {
        setActivePage(existingPage);
        setWikiContent(existingPage.content);
      } else {
        const newPage = {
          id: String(pages.length + 1),
          title: pageInfo.title.replace(/_/g, ' '),
          url: pageInfo.url,
          content,
          parent: activePage ? activePage.id : null,  // Correctly set parent for subsequent pages
          children: [],
        };
  
        if (pages.length === 0) { // Special handling for the VERY FIRST page
          newPage.parent = null; // VERY IMPORTANT: Set parent to null for the initial page!
        }
  
        setPages(prevPages => [...prevPages, newPage]);
        setActivePage(newPage);
        setWikiContent(content);
      }
    }
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    const pageInfo = extractPageTitle(urlInput);
    if (pageInfo) {
      await loadNewPage(pageInfo);
      setUrlInput('');
    }
  };

  const handleHomePageClick = () => {
    setUrlInput('https://en.wikipedia.org/wiki/Main_Page');
  };

  const handleNodeClick = (page) => {
    setActivePage(page);
    setWikiContent(page.content);
  };

  const renderEdges = () => {
    if (pages.length === 0) return null;

    const rootData = pages.find(page => !page.parent);
    if (!rootData) return null;

    const root = d3.hierarchy(rootData, (d) => {
      return pages.filter(page => page.parent === d.id);
    });

    const links = root.links();

    return links.map((link, i) => (
      <Edge
        key={i}
        startX={link.source.x}
        startY={link.source.y}
        endX={link.target.x}
        endY={link.target.y}
      />
    ));
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen">
      <div className="w-1/3 p-4 border-r">
        <h2 className="text-xl font-bold mb-4">Navigation History</h2>
        <div
          className="border rounded bg-gray-50 overflow-hidden"
          style={{ width: '400px', height: '600px' }}
          onWheel={handleWheel}
        >
          <svg
            ref={svgRef}
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
              Enter a Wikipedia URL above or click "Load Wikipedia Home Page" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WikiNavTree;