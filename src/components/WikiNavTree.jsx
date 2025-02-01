import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Github, Download, Maximize2, Minimize2, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';

// Style customization for Wikipedia content and overall UI
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
  .toolbar-button {
    padding: 8px;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: 4px;
    transition: background-color 0.2s;
  }
  .toolbar-button:hover {
    background-color: #f0f0f0;
  }
  .toolbar-button.active {
    color: #3B82F6;
  }
`;

// Node component – accepts an optional "suggested" prop for related suggestions.
const Node = ({ x, y, title, thumbnail, isActive, suggested, onClick }) => {
  const safeId = `circle-clip-${title.replace(/[^a-zA-Z0-9]/g, '-')}`;
  return (
    <g transform={`translate(${x},${y})`} onClick={onClick} style={{ cursor: 'pointer' }} className="transition-transform duration-200 ease-in-out">
      <defs>
        <clipPath id={safeId}>
          <circle r="25" />
        </clipPath>
      </defs>
      <circle 
        r="30" 
        fill={ suggested ? '#e0e0e0' : (isActive ? '#3B82F6' : '#fff') } 
        stroke={ suggested ? '#aaa' : (isActive ? '#1E40AF' : '#000') }
        strokeWidth="2"
        style={ suggested ? { opacity: 0.6 } : {} }
        className="transition-all duration-200 ease-in-out shadow-lg"
      />
      {thumbnail && (
        <image
          x="-25"
          y="-25"
          width="50"
          height="50"
          href={thumbnail}
          clipPath={`url(#${safeId})`}
          preserveAspectRatio="xMidYMid slice"
          className="transition-opacity duration-200"
        />
      )}
      <text 
        textAnchor="middle" 
        dy="50"
        style={ suggested ? { opacity: 0.6, fill: '#555', fontSize: '10px' } : {} }
        className={`text-sm ${isActive ? 'font-bold text-blue-600' : 'text-gray-700'} transition-all duration-200`}
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
      </text>
    </g>
  );
};

// Edge component – accepts an optional "suggested" prop.
const Edge = ({ startX, startY, endX, endY, suggested }) => (
  <g>
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="#4B5563" className="transition-colors duration-200" />
      </marker>
    </defs>
    <line 
      x1={startX} 
      y1={startY} 
      x2={endX} 
      y2={endY} 
      stroke={suggested ? "#aaa" : "#4B5563"} 
      strokeWidth="2"
      markerEnd="url(#arrowhead)"
      style={suggested ? { strokeOpacity: 0.5 } : {}}
      className="transition-all duration-200"
    />
  </g>
);

// Resizer component.
const Resizer = ({ onMouseDown }) => (
  <div className="w-2 cursor-col-resize bg-gray-200 hover:bg-gray-300 active:bg-gray-400" onMouseDown={onMouseDown} />
);

// Dummy function that simulates a Wikipedia2Vec-based API call.
// Replace this with a real API endpoint that returns related pages based on cosine similarity.
const getRelatedLinks = async (title) => {
  // Simulate a delay.
  await new Promise(resolve => setTimeout(resolve, 500));
  return [
    { title: `${title} (Related 1)`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}_Related_1` },
    { title: `${title} (Related 2)`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}_Related_2` },
    { title: `${title} (Related 3)`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}_Related_3` }
  ];
};

const WikiNavTree = () => {
  useEffect(() => { document.title = 'WikiNav'; }, []);
  const [horizontalSpread, setHorizontalSpread] = useState(300);
  const [pages, setPages] = useState([]);
  const [activePage, setActivePage] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [wikiContent, setWikiContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [leftPaneWidth, setLeftPaneWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // State for the force-layout toggle.
  const [isSplayed, setIsSplayed] = useState(false);
  const preSplayPositionsRef = useRef(null);

  // State for related page suggestions (Wikipedia2Vec-based).
  const [showSeeAlso, setShowSeeAlso] = useState(false);
  const [seeAlsoNodes, setSeeAlsoNodes] = useState([]);

  // Fetch Wikipedia homepage content.
  const fetchHomePage = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=Main_Page&format=json&origin=*&prop=text`
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

  useEffect(() => {
    fetchHomePage();
  }, []);

  const checkPageType = async (title) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&prop=categories|pageprops&titles=${encodeURIComponent(title)}&format=json&origin=*`
      );
      const data = await response.json();
      const page = Object.values(data.query.pages)[0];
      if (page.pageprops && page.pageprops.disambiguation !== undefined) return 'disambiguation';
      if (page.categories) {
        const isImagePage = page.categories.some(cat => 
          cat.title.includes('Image:') || cat.title.includes('File:') || cat.title.includes('Category:Images')
        );
        if (isImagePage) return 'image';
      }
      return 'article';
    } catch (error) {
      console.error('Error checking page type:', error);
      return 'unknown';
    }
  };

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
      setPan({
        x: svgWidth / 2 - ((bounds.minX + graphWidth / 2) * scale) + padding,
        y: svgHeight / 2 - ((bounds.minY + graphHeight / 2) * scale) + padding
      });
    }
  };

  const handleCenterGraph = () => {
    if (pages.length > 0) {
      setPan({ x: 50, y: 50 });
      setZoom(1);
    }
  };

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

  const handleNodeClick = (page) => {
    setActivePage(page);
    setWikiContent(page.content);
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      const previousPage = navigationHistory[historyIndex - 1];
      setActivePage(previousPage);
      setWikiContent(previousPage.content);
      setHistoryIndex(prev => prev - 1);
    }
  };

  useEffect(() => {
    if (activePage && (navigationHistory[historyIndex]?.id !== activePage.id)) {
      setNavigationHistory(prev => [...prev.slice(0, historyIndex + 1), activePage]);
      setHistoryIndex(prev => prev + 1);
    }
  }, [activePage, historyIndex, navigationHistory]);

  const searchWikipedia = async (query) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&format=json&origin=*`
      );
      const [term, titles, descriptions, urls] = await response.json();
      return titles.map((title, i) => ({ title, description: descriptions[i], url: urls[i] }));
    } catch (error) {
      console.error('Error searching Wikipedia:', error);
      return [];
    }
  };

  const fetchWikiContent = async (title) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&format=json&origin=*&prop=text`
      );
      const data = await response.json();
      if (data.parse && data.parse.text) return data.parse.text['*'];
      throw new Error('Failed to fetch Wikipedia content');
    } catch (error) {
      console.error('Error fetching Wikipedia content:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const fetchWikiThumbnail = async (title) => {
    try {
      const response = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*&pithumbsize=100`
      );
      const data = await response.json();
      const page = Object.values(data.query.pages)[0];
      return page.thumbnail?.source || null;
    } catch (error) {
      console.error('Error fetching thumbnail:', error);
      return null;
    }
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

  const extractPageTitle = (url) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('wikipedia.org')) {
        const pathParts = urlObj.pathname.split('/');
        return { title: decodeURIComponent(pathParts[pathParts.length - 1]), url };
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  const handleWikiLinkClick = async (e) => {
    if (e.target.tagName === 'A') {
      e.preventDefault();
      const href = e.target.getAttribute('href');
      if (href && href.startsWith('/wiki/')) {
        const title = href.replace('/wiki/', '');
        if (!title.startsWith('File:') && !title.startsWith('Category:')) {
          const url = `https://en.wikipedia.org${href}`;
          await loadNewPage({ title, url });
        }
      }
    }
  };

  const calculateNodePosition = (parentX, parentY, index, siblingCount) => {
    const levelSpacing = 120;
    const nodeSpacing = 100;
    const totalWidth = (siblingCount - 1) * nodeSpacing;
    return { x: parentX - totalWidth / 2 + (index * nodeSpacing), y: parentY + levelSpacing };
  };

  const loadNewPage = async (pageInfo) => {
    const content = await fetchWikiContent(pageInfo.title);
    const thumbnail = await fetchWikiThumbnail(pageInfo.title);
    if (content) {
      const pageType = await checkPageType(pageInfo.title);
      const shouldAddToTree = pageType !== 'disambiguation' && pageType !== 'image';
      const existingPage = pages.find(p =>
        p.title.toLowerCase() === pageInfo.title.replace(/_/g, ' ').toLowerCase()
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
            : calculateNodePosition(activePage.x, activePage.y, activePage.children.length, activePage.children.length + 1);
          const newPage = {
            id: String(pages.length + 1),
            title: pageInfo.title.replace(/_/g, ' '),
            url: pageInfo.url,
            content,
            thumbnail,
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
          setWikiContent(content);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSearchResults([]);
    const pageInfo = extractPageTitle(searchInput);
    if (pageInfo) {
      await loadNewPage(pageInfo);
    } else {
      const searchTitle = searchInput.replace(/\s+/g, '_');
      await loadNewPage({ title: searchTitle, url: `https://en.wikipedia.org/wiki/${searchTitle}` });
    }
    setSearchInput('');
  };

  // Render committed page edges.
  const renderEdges = () => {
    return pages.flatMap(page =>
      page.children.map(childId => {
        const child = pages.find(p => p.id === childId);
        return child ? (
          <Edge key={`${page.id}-${childId}`} startX={page.x} startY={page.y} endX={child.x} endY={child.y} />
        ) : null;
      })
    );
  };

  // Render edges for related (see-also) suggestion nodes.
  const renderSeeAlsoEdges = () => {
    if (!activePage) return null;
    return seeAlsoNodes.map(node => (
      <Edge key={`seeAlso-edge-${node.id}`} startX={activePage.x} startY={activePage.y} endX={node.x} endY={node.y} suggested={true} />
    ));
  };

  // Render suggestion nodes.
  const renderSeeAlsoNodes = () => {
    return seeAlsoNodes.map(node => (
      <Node 
        key={node.id} 
        x={node.x} 
        y={node.y} 
        title={node.title} 
        suggested={true}
        onClick={() => {
          loadNewPage({ title: node.title, url: node.url });
          setSeeAlsoNodes([]);
        }} 
      />
    ));
  };

  // Improved Force-Directed Layout using D3.
  const applyForceDirectedLayout = () => {
    if (pages.length === 0) return;
    setIsAnimating(true);
    const links = [];
    pages.forEach(page => {
      page.children.forEach(childId => {
        const child = pages.find(p => p.id === childId);
        if (child) {
          links.push({ source: page.id, target: child.id });
        }
      });
    });
    const svgEl = svgRef.current;
    const width = svgEl.clientWidth;
    const height = svgEl.clientHeight;
    const simulation = d3.forceSimulation(pages)
      .force('link', d3.forceLink(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(40))
      .alpha(1)
      .restart();
      
    simulation.on('tick', () => {
      setPages(simulation.nodes().map(n => ({ ...n })));
      if (simulation.alpha() < 0.05) {
        simulation.stop();
        setIsAnimating(false);
      }
    });
  };

  // Toggle the force layout (splay mode). When enabling, save positions and animate; when disabling, restore saved positions.
  const handleToggleSplay = () => {
    if (isAnimating) return;
    if (!isSplayed) {
      preSplayPositionsRef.current = pages.map(p => ({ ...p }));
      applyForceDirectedLayout();
      setIsSplayed(true);
    } else {
      if (preSplayPositionsRef.current) {
        setPages(preSplayPositionsRef.current);
      }
      setIsSplayed(false);
    }
  };

  // When the See Also toggle is on, automatically force splay (if not already) and fetch related pages using Wikipedia2Vec.
  useEffect(() => {
    if (showSeeAlso && activePage) {
      if (!isSplayed && !isAnimating) {
        handleToggleSplay();
      }
      const fetchRelated = async () => {
        const links = await getRelatedLinks(activePage.title);
        if (links.length === 0) {
          setSeeAlsoNodes([]);
          return;
        }
        const N = links.length;
        const radius = 150;
        const centerX = activePage.x;
        const centerY = activePage.y;
        const nodes = links.map((link, i) => {
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
      };
      fetchRelated();
    } else {
      setSeeAlsoNodes([]);
    }
  }, [showSeeAlso, activePage]);

  // Reset the tree visualization (clear tree data and navigation history, and reload the homepage).
  const handleReset = async () => {
    setPages([]);
    setActivePage(null);
    setNavigationHistory([]);
    setHistoryIndex(-1);
    setSearchInput('');
    await fetchHomePage();
  };

  // SpreadControls component for adjusting horizontalSpread.
  const SpreadControls = () => (
    <div className="flex">
      <button
        onClick={() => {
          const newSpread = Math.max(50, horizontalSpread * 0.7);
          setHorizontalSpread(newSpread);
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded-l-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200 flex items-center gap-1"
        title="Narrow Layout"
      >
        <ChevronLeft size={16} />
        <span>Narrow</span>
      </button>
      <button
        onClick={() => {
          const newSpread = Math.min(1000, horizontalSpread * 4.4);
          setHorizontalSpread(newSpread);
        }}
        className="px-4 py-2 bg-blue-500 text-white rounded-r-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200 flex items-center gap-1 border-l border-blue-400"
        title="Widen Layout"
      >
        <span>Widen</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-gray-50">
      <style>{styles}</style>
      <div className="flex flex-1 min-h-0">
        <div className="h-full border-r bg-gradient-to-br from-white to-blue-50" style={{ width: `${leftPaneWidth}px` }}>
          <div className="h-full flex flex-col">
            <div className="p-4 bg-white border-b shadow-sm flex justify-between items-center">
              <h2 className="text-xl font-bold">WIKINAV</h2>
              <div className="flex gap-2">
                <button onClick={handleReset} className="toolbar-button" title="Reset Tree">
                  Reset
                </button>
                <button 
                  onClick={() => setShowSeeAlso(prev => !prev)} 
                  className={`toolbar-button ${showSeeAlso ? 'active' : ''}`} 
                  title="Toggle Related Pages"
                >
                  <BookOpen size={20} />
                </button>
                <button
                  onClick={handleToggleSplay}
                  className={`toolbar-button ${isAnimating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Splay Tree"
                  disabled={isAnimating}
                >
                  {isSplayed ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                </button>
                <button onClick={exportTree} className="toolbar-button" title="Export Tree">
                  <Download size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <svg ref={svgRef} width="100%" height="100%" onWheel={handleWheel} onMouseDown={handleMouseDown} style={{ cursor: isDragging ? 'grabbing' : 'grab' }} className="transition-all duration-200">
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {renderEdges()}
                  {renderSeeAlsoEdges()}
                  {pages.map(page => (
                    <Node key={page.id} x={page.x} y={page.y} title={page.title} thumbnail={page.thumbnail} isActive={activePage && page.id === activePage.id} onClick={() => handleNodeClick(page)} />
                  ))}
                  {renderSeeAlsoNodes()}
                </g>
              </svg>
            </div>
          </div>
        </div>
        <Resizer onMouseDown={handleResizeStart} />
        <div className="flex-1 flex flex-col p-4 min-w-[400px] bg-white">
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
                        await loadNewPage({ title: result.title, url: result.url });
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
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleBack}
              disabled={historyIndex <= 0}
              className={`px-4 py-2 rounded-lg shadow transition-all duration-200 ${historyIndex <= 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700'}`}
            >
              Back
            </button>
            <button onClick={handleCenterGraph} className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200">
              Center Graph
            </button>
            <button onClick={handleFitGraph} className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 active:bg-blue-700 transition-all duration-200">
              Fit Graph
            </button>
            <SpreadControls />
          </div>
          <div className="flex-1 border rounded-lg shadow-sm p-4 overflow-auto bg-white">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-xl text-gray-600 animate-pulse">Loading...</div>
              </div>
            ) : (
              <div onClick={handleWikiLinkClick} dangerouslySetInnerHTML={{ __html: wikiContent }} className="wiki-content prose max-w-none" />
            )}
          </div>
        </div>
      </div>
      <div className="w-full bg-white border-t py-1 px-4 flex justify-center items-center">
        <a href="https://github.com/whosawme/wikinav" target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-gray-700 transition-colors" title="View on GitHub">
          <Github size={20} />
        </a>
      </div>
    </div>
  );
};

export default WikiNavTree;
