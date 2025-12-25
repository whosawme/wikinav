import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { X, Rabbit, Brain, Network, Loader2, ChevronRight, ExternalLink, Zap, Cpu } from 'lucide-react';
import { parseSeeAlsoLinks } from '../services/wikipediaApi';
import {
  extractTopicsTFIDF,
  extractTopicsTransformer,
  getTransformerStatus,
  loadTransformerModel,
  analyzeTopicsWithSections,
  TOPIC_COLORS
} from '../services/topicExtraction';

const RabbitHoleShelf = ({
  isOpen,
  onClose,
  currentPage,
  onLoadPage,
  loadPageData
}) => {
  const [activeTab, setActiveTab] = useState('dig'); // 'dig' | 'topics'
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [rabbitPages, setRabbitPages] = useState([]);
  const [rabbitLinks, setRabbitLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [error, setError] = useState(null);

  // Topic extraction settings
  const [topicMethod, setTopicMethod] = useState('tfidf'); // 'tfidf' | 'transformer'
  const [transformerStatus, setTransformerStatus] = useState('not_loaded');
  const [modelLoadProgress, setModelLoadProgress] = useState(0);

  const canvasRef = useRef(null);
  const simulationRef = useRef(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize with current page when opened
  useEffect(() => {
    if (isOpen && currentPage && rabbitPages.length === 0) {
      const rootNode = {
        id: currentPage.id,
        title: currentPage.title,
        url: currentPage.url,
        thumbnail: currentPage.thumbnail,
        seeAlso: currentPage.seeAlso || [],
        isRoot: true,
        x: 300,
        y: 300,
        explored: false
      };
      setRabbitPages([rootNode]);
      setSelectedNode(rootNode);
    }
  }, [isOpen, currentPage]);

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      // Cleanup simulation
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      setRabbitPages([]);
      setRabbitLinks([]);
      setSelectedNode(null);
      setAnalysisResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Run force simulation when nodes change
  useEffect(() => {
    if (rabbitPages.length > 0 && canvasRef.current) {
      runSimulation();
    }
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
    };
  }, [rabbitPages.length, rabbitLinks.length]);

  const runSimulation = () => {
    if (!canvasRef.current) return;

    const width = canvasRef.current.clientWidth;
    const height = canvasRef.current.clientHeight;

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const nodesCopy = rabbitPages.map(n => ({ ...n }));
    const linksCopy = rabbitLinks.map(l => ({ ...l }));

    const simulation = d3.forceSimulation(nodesCopy)
      .force('link', d3.forceLink(linksCopy).id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(60));

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      setRabbitPages(nodesCopy.map(n => ({
        ...rabbitPages.find(p => p.id === n.id),
        x: n.x,
        y: n.y
      })));
    });
  };

  // Dig analysis - fetch related articles and compute similarity
  const performDigAnalysis = async () => {
    if (!selectedNode) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get See Also links from the selected page
      let seeAlsoLinks = selectedNode.seeAlso || [];

      if (seeAlsoLinks.length === 0) {
        // Fetch page content to get See Also links
        const pageData = await loadPageData(selectedNode.title);
        if (pageData && pageData.content) {
          // Parse See Also links from the fetched content
          const parsedLinks = parseSeeAlsoLinks(pageData.content);
          if (parsedLinks && parsedLinks.length > 0) {
            seeAlsoLinks = parsedLinks;
            // Update the selected node with the parsed links
            setRabbitPages(prev => prev.map(p =>
              p.id === selectedNode.id ? { ...p, seeAlso: parsedLinks } : p
            ));
          }
        }
      }

      const relatedLinks = seeAlsoLinks;

      if (relatedLinks.length === 0) {
        setError('No "See Also" section found for this page. Try a different article.');
        setIsAnalyzing(false);
        return;
      }

      // Create nodes for related articles
      const newNodes = [];
      const newLinks = [];

      for (const link of relatedLinks.slice(0, 8)) {
        const nodeId = `rabbit-${link.title.replace(/\s+/g, '-')}`;

        // Check if node already exists
        if (!rabbitPages.find(p => p.title === link.title)) {
          newNodes.push({
            id: nodeId,
            title: link.title,
            url: link.url.startsWith('http') ? link.url : `https://en.wikipedia.org${link.url}`,
            thumbnail: null,
            seeAlso: [],
            isRoot: false,
            explored: false,
            x: selectedNode.x + (Math.random() - 0.5) * 200,
            y: selectedNode.y + (Math.random() - 0.5) * 200
          });

          newLinks.push({
            source: selectedNode.id,
            target: nodeId
          });
        }
      }

      // Mark current node as explored
      setRabbitPages(prev => {
        const updated = prev.map(p =>
          p.id === selectedNode.id ? { ...p, explored: true } : p
        );
        return [...updated, ...newNodes];
      });

      setRabbitLinks(prev => [...prev, ...newLinks]);

      setAnalysisResults({
        type: 'dig',
        sourceTitle: selectedNode.title,
        relatedCount: newNodes.length,
        articles: relatedLinks.slice(0, 8)
      });

    } catch (err) {
      setError(`Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Topic modeling using client-side extraction
  const performTopicAnalysis = async () => {
    if (!selectedNode) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Get page content if not available
      let content = selectedNode.content;
      if (!content) {
        const pageData = await loadPageData(selectedNode.title);
        if (pageData && pageData.content) {
          content = pageData.content;
        }
      }

      if (!content) {
        setError('Could not load page content for analysis.');
        setIsAnalyzing(false);
        return;
      }

      // Use the new section-based analysis
      const progressCallback = topicMethod === 'transformer'
        ? (progress) => {
            if (progress.status === 'progress') {
              setModelLoadProgress(Math.round(progress.progress || 0));
            }
          }
        : null;

      if (topicMethod === 'transformer') {
        setTransformerStatus('loading');
      }

      const { topics, sectionsWithTopics } = await analyzeTopicsWithSections(
        content,
        topicMethod,
        { numTopics: 4, onProgress: progressCallback }
      );

      if (topicMethod === 'transformer') {
        setTransformerStatus('ready');
      }

      if (!topics || topics.length === 0) {
        setError('Could not extract topics from this page. Try a longer article.');
        setIsAnalyzing(false);
        return;
      }

      setAnalysisResults({
        type: 'topics',
        method: topicMethod,
        sourceTitle: selectedNode.title,
        topics,
        sectionsWithTopics,
        message: topicMethod === 'transformer'
          ? 'Topics extracted using neural embeddings (Transformers.js)'
          : 'Topics extracted using TF-IDF + K-Means clustering'
      });

    } catch (err) {
      console.error('Topic analysis error:', err);
      setError(`Topic analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle node click in the graph
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setAnalysisResults(null);
  };

  // Handle double-click to expand node (dig deeper from that node)
  const handleNodeDoubleClick = async (node) => {
    // Set as selected and immediately start dig analysis
    setSelectedNode(node);
    setAnalysisResults(null);

    // Only dig if not already explored
    if (node.explored) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Fetch page content to get See Also links
      const pageData = await loadPageData(node.title);
      if (!pageData || !pageData.content) {
        setError('Could not load page content');
        setIsAnalyzing(false);
        return;
      }

      // Parse See Also links from the fetched content
      const seeAlsoLinks = parseSeeAlsoLinks(pageData.content);

      if (seeAlsoLinks.length === 0) {
        setError(`No "See Also" links found for "${node.title}"`);
        setIsAnalyzing(false);
        return;
      }

      // Create nodes for related articles
      const newNodes = [];
      const newLinks = [];

      for (const link of seeAlsoLinks.slice(0, 8)) {
        const nodeId = `rabbit-${link.title.replace(/\s+/g, '-')}-${Date.now()}`;

        // Check if node already exists
        if (!rabbitPages.find(p => p.title === link.title)) {
          newNodes.push({
            id: nodeId,
            title: link.title,
            url: link.url,
            thumbnail: null,
            seeAlso: [],
            isRoot: false,
            explored: false,
            x: node.x + (Math.random() - 0.5) * 200,
            y: node.y + (Math.random() - 0.5) * 200
          });

          newLinks.push({
            source: node.id,
            target: nodeId
          });
        }
      }

      // Mark current node as explored and add new nodes
      setRabbitPages(prev => {
        const updated = prev.map(p =>
          p.id === node.id ? { ...p, explored: true, seeAlso: seeAlsoLinks } : p
        );
        return [...updated, ...newNodes];
      });

      setRabbitLinks(prev => [...prev, ...newLinks]);

      setAnalysisResults({
        type: 'dig',
        sourceTitle: node.title,
        relatedCount: newNodes.length,
        articles: seeAlsoLinks.slice(0, 8)
      });

    } catch (err) {
      setError(`Failed to expand: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load a page from rabbit hole into main view
  const handleOpenInMain = async (node) => {
    if (onLoadPage) {
      await onLoadPage({ title: node.title, url: node.url });
    }
  };

  // Canvas interaction handlers
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom(z => Math.min(Math.max(0.3, z + delta), 3));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0 && e.target.tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`fixed inset-y-0 right-0 w-full md:w-3/4 lg:w-2/3 transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700" style={{ backgroundColor: '#16213e' }}>
        <div className="flex items-center space-x-3">
          <Rabbit className="text-purple-400" size={28} />
          <h2 className="text-xl font-bold text-white">The Rabbit Hole</h2>
          {currentPage && (
            <span className="text-gray-400 text-sm ml-2">
              Starting from: {currentPage.title}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded hover:bg-gray-700 transition-colors text-gray-300"
          title="Close"
        >
          <X size={24} />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex h-[calc(100%-64px)]">
        {/* Left sidebar - Analysis controls */}
        <div className="w-80 border-r border-gray-700 flex flex-col" style={{ backgroundColor: '#16213e' }}>
          {/* Tab buttons */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('dig')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'dig'
                  ? 'bg-purple-900/50 text-purple-300 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Network size={16} className="inline mr-2" />
              Dig
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'topics'
                  ? 'bg-purple-900/50 text-purple-300 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Brain size={16} className="inline mr-2" />
              Topics
            </button>
          </div>

          {/* Selected node info */}
          <div className="p-4 border-b border-gray-700">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Selected</h3>
            {selectedNode ? (
              <div className="flex items-center space-x-3">
                {selectedNode.thumbnail ? (
                  <img
                    src={selectedNode.thumbnail}
                    alt={selectedNode.title}
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-purple-900 flex items-center justify-center border-2 border-purple-500">
                    <span className="text-purple-300 text-lg font-bold">
                      {selectedNode.title.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{selectedNode.title}</p>
                  <p className="text-gray-500 text-xs">
                    {selectedNode.explored ? 'Explored' : 'Not explored'}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenInMain(selectedNode)}
                  className="p-2 text-gray-400 hover:text-purple-400 transition-colors"
                  title="Open in main view"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Select a node to analyze</p>
            )}
          </div>

          {/* Model selection for Topics tab */}
          {activeTab === 'topics' && (
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Extraction Method</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setTopicMethod('tfidf')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                    topicMethod === 'tfidf'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Zap size={14} />
                  <span>Fast</span>
                </button>
                <button
                  onClick={() => setTopicMethod('transformer')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                    topicMethod === 'transformer'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <Cpu size={14} />
                  <span>Neural</span>
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                {topicMethod === 'tfidf'
                  ? 'TF-IDF + K-Means: Instant, lightweight (~5KB)'
                  : 'Transformers.js: Higher quality (~80MB model, cached)'}
              </p>
              {topicMethod === 'transformer' && transformerStatus === 'loading' && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-xs text-purple-400">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Loading model... {modelLoadProgress}%</span>
                  </div>
                  <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${modelLoadProgress}%` }}
                    />
                  </div>
                </div>
              )}
              {topicMethod === 'transformer' && transformerStatus === 'ready' && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full" />
                  Model loaded and ready
                </p>
              )}
            </div>
          )}

          {/* Analysis action */}
          <div className="p-4 border-b border-gray-700">
            <button
              onClick={activeTab === 'dig' ? performDigAnalysis : performTopicAnalysis}
              disabled={!selectedNode || isAnalyzing}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all ${
                !selectedNode || isAnalyzing
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={18} className="inline mr-2 animate-spin" />
                  {topicMethod === 'transformer' && activeTab === 'topics'
                    ? 'Loading model & analyzing...'
                    : 'Analyzing...'}
                </>
              ) : activeTab === 'dig' ? (
                <>
                  <Network size={18} className="inline mr-2" />
                  Dig Deeper
                </>
              ) : (
                <>
                  <Brain size={18} className="inline mr-2" />
                  Extract Topics
                </>
              )}
            </button>
            <p className="text-gray-500 text-xs mt-2 text-center">
              {activeTab === 'dig'
                ? 'Find related articles from See Also section'
                : topicMethod === 'tfidf'
                  ? 'Fast keyword extraction with clustering'
                  : 'Neural semantic topic extraction'}
            </p>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-900/30 border-b border-red-800">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Analysis results */}
          <div className="flex-1 overflow-y-auto p-4">
            {analysisResults && (
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  {analysisResults.type === 'dig' ? 'Related Articles' : 'Extracted Topics'}
                </h3>

                {analysisResults.type === 'dig' && analysisResults.articles && (
                  <div className="space-y-2">
                    {analysisResults.articles.map((article, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer group"
                        onClick={() => {
                          const node = rabbitPages.find(p => p.title === article.title);
                          if (node) setSelectedNode(node);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-200 text-sm">{article.title}</span>
                          <ChevronRight size={14} className="text-gray-600 group-hover:text-purple-400 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {analysisResults.type === 'topics' && analysisResults.topics && (
                  <div className="space-y-3">
                    {analysisResults.message && (
                      <p className="text-purple-400/80 text-xs mb-3 flex items-center gap-1">
                        {analysisResults.method === 'transformer' ? (
                          <Cpu size={12} />
                        ) : (
                          <Zap size={12} />
                        )}
                        {analysisResults.message}
                      </p>
                    )}
                    {analysisResults.topics.map((topic, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-gray-800/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-purple-300 text-sm font-medium">{topic.name}</span>
                          <span className="text-gray-500 text-xs">{Math.round(topic.probability * 100)}%</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {topic.keywords.map((kw, kidx) => (
                            <span
                              key={kidx}
                              className="px-2 py-1 rounded-full bg-purple-900/50 text-purple-300 text-xs"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                        {topic.representative && analysisResults.method === 'transformer' && (
                          <p className="text-gray-500 text-xs mt-2 italic truncate">
                            "{topic.representative}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Graph canvas or Topic sections view */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'topics' && analysisResults?.type === 'topics' && analysisResults.sectionsWithTopics ? (
            /* Topic Section Visualization */
            <div className="h-full overflow-y-auto p-4" style={{ backgroundColor: '#0f0f23' }}>
              {/* Topic legend */}
              <div className="mb-4 p-3 rounded-lg bg-gray-800/50">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Topic Legend</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResults.topics.map((topic, idx) => (
                    <div
                      key={topic.id}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                      style={{ backgroundColor: `${TOPIC_COLORS[idx % TOPIC_COLORS.length]}20` }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: TOPIC_COLORS[idx % TOPIC_COLORS.length] }}
                      />
                      <span style={{ color: TOPIC_COLORS[idx % TOPIC_COLORS.length] }}>
                        {topic.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section map */}
              <div className="space-y-2">
                {analysisResults.sectionsWithTopics.map((section, idx) => {
                  const primaryColor = section.primaryTopic?.color || '#4b5563';
                  const opacity = section.primaryTopic ? Math.max(0.3, section.primaryTopic.score) : 0.2;

                  return (
                    <div
                      key={section.id || idx}
                      className="rounded-lg overflow-hidden transition-all hover:scale-[1.01]"
                      style={{
                        backgroundColor: `${primaryColor}${Math.round(opacity * 40).toString(16).padStart(2, '0')}`,
                        borderLeft: `4px solid ${primaryColor}`
                      }}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <h5
                            className="font-medium text-sm"
                            style={{ color: primaryColor }}
                          >
                            {section.level === 3 && <span className="text-gray-500 mr-2">↳</span>}
                            {section.title}
                          </h5>
                          {section.primaryTopic && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${primaryColor}30`,
                                color: primaryColor
                              }}
                            >
                              {section.primaryTopic.topicName}
                              <span className="ml-1 opacity-60">
                                {Math.round(section.primaryTopic.score * 100)}%
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Text preview */}
                        <p className="text-gray-400 text-xs line-clamp-2">
                          {section.text.substring(0, 150)}...
                        </p>

                        {/* Secondary topics */}
                        {section.secondaryTopics?.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {section.secondaryTopics.map((t, tidx) => (
                              <span
                                key={tidx}
                                className="text-xs px-1.5 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${t.color}20`,
                                  color: t.color
                                }}
                              >
                                {t.topicName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {analysisResults.sectionsWithTopics.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Brain size={40} className="mx-auto mb-3 opacity-50" />
                  <p>No sections found in this article</p>
                </div>
              )}
            </div>
          ) : (
            /* Dig Graph Canvas */
            <div
              className="h-full"
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <svg
                ref={canvasRef}
                width="100%"
                height="100%"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                style={{
                  cursor: isDragging ? 'grabbing' : 'grab',
                  backgroundColor: '#0f0f23'
                }}
              >
                {/* Grid pattern for visual depth */}
                <defs>
                  <pattern id="rabbit-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1a1a3e" strokeWidth="0.5"/>
                  </pattern>
                  <clipPath id="rabbit-circle-clip">
                    <circle r="30" />
                  </clipPath>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                <rect width="100%" height="100%" fill="url(#rabbit-grid)" />

                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                  {/* Render edges */}
                  {rabbitLinks.map((link, idx) => {
                    const sourceNode = rabbitPages.find(n => n.id === (link.source.id || link.source));
                    const targetNode = rabbitPages.find(n => n.id === (link.target.id || link.target));
                    if (!sourceNode || !targetNode) return null;

                    return (
                      <line
                        key={`rabbit-link-${idx}`}
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="#6b21a8"
                        strokeWidth="2"
                        opacity="0.5"
                      />
                    );
                  })}

                  {/* Render nodes */}
                  {rabbitPages.map(node => (
                    <g
                      key={`rabbit-node-${node.id}`}
                      transform={`translate(${node.x},${node.y})`}
                      onClick={() => handleNodeClick(node)}
                      onDoubleClick={() => handleNodeDoubleClick(node)}
                      style={{ cursor: node.explored ? 'pointer' : 'zoom-in' }}
                      filter={selectedNode?.id === node.id ? 'url(#glow)' : undefined}
                    >
                      {/* Node circle */}
                      <circle
                        r={node.isRoot ? 40 : 30}
                        fill={node.isRoot ? '#7c3aed' : node.explored ? '#4c1d95' : '#1e1b4b'}
                        stroke={selectedNode?.id === node.id ? '#a78bfa' : node.isRoot ? '#a78bfa' : '#6b21a8'}
                        strokeWidth={selectedNode?.id === node.id ? 3 : 2}
                      />

                      {/* Thumbnail or initial */}
                      {node.thumbnail ? (
                        <image
                          x={node.isRoot ? -35 : -25}
                          y={node.isRoot ? -35 : -25}
                          width={node.isRoot ? 70 : 50}
                          height={node.isRoot ? 70 : 50}
                          href={node.thumbnail}
                          clipPath="url(#rabbit-circle-clip)"
                          preserveAspectRatio="xMidYMid slice"
                        />
                      ) : (
                        <text
                          textAnchor="middle"
                          dy="6"
                          fill="#a78bfa"
                          fontSize={node.isRoot ? 18 : 14}
                          fontWeight="bold"
                        >
                          {node.title.charAt(0).toUpperCase()}
                        </text>
                      )}

                      {/* Label */}
                      <text
                        textAnchor="middle"
                        dy={node.isRoot ? 60 : 50}
                        fill="#e2e8f0"
                        fontSize="11"
                        className="pointer-events-none"
                      >
                        {node.title.length > 18 ? node.title.substring(0, 16) + '...' : node.title}
                      </text>

                      {/* Explored indicator */}
                      {node.explored && !node.isRoot && (
                        <circle
                          cx={node.isRoot ? 30 : 22}
                          cy={node.isRoot ? -30 : -22}
                          r="6"
                          fill="#22c55e"
                          stroke="#0f0f23"
                          strokeWidth="2"
                        />
                      )}
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RabbitHoleShelf;
