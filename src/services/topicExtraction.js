/**
 * Client-side Topic Extraction Service
 * Provides two approaches: TF-IDF + K-Means (lightweight) and Transformers.js (neural)
 */

// ============================================================================
// TF-IDF + K-MEANS APPROACH (Lightweight, instant)
// ============================================================================

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both',
  'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
  'once', 'if', 'unless', 'until', 'while', 'about', 'after', 'before', 'between',
  'into', 'through', 'during', 'above', 'below', 'up', 'down', 'out', 'off', 'over',
  'under', 'again', 'further', 'any', 'because', 'being', 'him', 'her', 'his', 'hers',
  'their', 'theirs', 'our', 'ours', 'my', 'your', 'yours', 'itself', 'himself', 'herself',
  'themselves', 'ourselves', 'yourself', 'yourselves', 'myself', 'one', 'two', 'three',
  'first', 'second', 'third', 'new', 'old', 'high', 'low', 'well', 'way', 'even', 'back',
  'still', 'since', 'another', 'around', 'however', 'although', 'though', 'whether',
  'either', 'neither', 'much', 'many', 'made', 'make', 'get', 'got', 'go', 'went',
  'come', 'came', 'see', 'saw', 'seen', 'know', 'known', 'take', 'took', 'taken',
  'give', 'gave', 'given', 'find', 'found', 'think', 'thought', 'say', 'said', 'tell',
  'told', 'ask', 'asked', 'use', 'used', 'work', 'become', 'became', 'leave', 'left',
  'call', 'called', 'try', 'tried', 'seem', 'seemed', 'keep', 'kept', 'let', 'begin',
  'began', 'begun', 'show', 'shown', 'hear', 'heard', 'play', 'played', 'run', 'ran',
  'move', 'moved', 'live', 'lived', 'believe', 'hold', 'held', 'bring', 'brought',
  'happen', 'write', 'wrote', 'written', 'provide', 'sit', 'sat', 'stand', 'stood',
  'lose', 'lost', 'pay', 'paid', 'meet', 'met', 'include', 'continue', 'set', 'learn',
  'change', 'lead', 'led', 'understand', 'watch', 'follow', 'stop', 'create', 'speak',
  'read', 'allow', 'add', 'spend', 'grow', 'open', 'walk', 'win', 'offer', 'remember',
  'love', 'consider', 'appear', 'buy', 'wait', 'serve', 'die', 'send', 'expect', 'build',
  'stay', 'fall', 'cut', 'reach', 'kill', 'remain', 'within', 'along', 'among', 'often',
  'always', 'never', 'sometimes', 'usually', 'perhaps', 'maybe', 'probably', 'already',
  'yet', 'almost', 'enough', 'quite', 'rather', 'really', 'simply', 'actually', 'certainly',
  'thus', 'therefore', 'hence', 'instead', 'indeed', 'especially', 'particularly',
  'generally', 'usually', 'basically', 'currently', 'recently', 'previously', 'originally',
  'finally', 'eventually', 'immediately', 'suddenly', 'quickly', 'slowly', 'early', 'late',
  'ago', 'today', 'tomorrow', 'yesterday', 'later', 'earlier', 'soon', 'meanwhile',
  'according', 'including', 'following', 'during', 'regarding', 'despite', 'without',
  'ref', 'refs', 'cite', 'citation', 'retrieved', 'accessed', 'archived', 'isbn', 'doi',
  'http', 'https', 'www', 'com', 'org', 'net', 'edu', 'gov', 'html', 'pdf', 'page', 'pages',
  'edit', 'section', 'article', 'wikipedia', 'encyclopedia', 'category', 'categories'
]);

/**
 * Tokenize and clean text
 */
const tokenize = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
};

/**
 * Calculate term frequency for a document
 */
const calculateTF = (tokens) => {
  const tf = {};
  const totalTerms = tokens.length;
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  // Normalize by total terms
  Object.keys(tf).forEach(term => {
    tf[term] = tf[term] / totalTerms;
  });
  return tf;
};

/**
 * Calculate IDF across documents (or use single document with sections)
 */
const calculateIDF = (documents) => {
  const idf = {};
  const N = documents.length;

  // Count document frequency for each term
  const df = {};
  documents.forEach(doc => {
    const uniqueTerms = new Set(doc);
    uniqueTerms.forEach(term => {
      df[term] = (df[term] || 0) + 1;
    });
  });

  // Calculate IDF
  Object.keys(df).forEach(term => {
    idf[term] = Math.log(N / df[term]) + 1;
  });

  return idf;
};

/**
 * Calculate TF-IDF scores
 */
const calculateTFIDF = (tokens, idf) => {
  const tf = calculateTF(tokens);
  const tfidf = {};
  Object.keys(tf).forEach(term => {
    tfidf[term] = tf[term] * (idf[term] || 1);
  });
  return tfidf;
};

/**
 * K-Means clustering for keywords
 */
const kMeansCluster = (keywords, k = 3) => {
  if (keywords.length <= k) {
    return keywords.map((kw, i) => ({ ...kw, cluster: i }));
  }

  // Simple clustering based on co-occurrence and score similarity
  // Initialize centroids randomly
  const shuffled = [...keywords].sort(() => Math.random() - 0.5);
  const centroids = shuffled.slice(0, k).map(kw => kw.score);

  // Assign clusters based on score proximity
  const assignments = keywords.map(kw => {
    let minDist = Infinity;
    let cluster = 0;
    centroids.forEach((centroid, i) => {
      const dist = Math.abs(kw.score - centroid);
      if (dist < minDist) {
        minDist = dist;
        cluster = i;
      }
    });
    return { ...kw, cluster };
  });

  // Refine centroids (one iteration for simplicity)
  const newCentroids = Array(k).fill(0);
  const counts = Array(k).fill(0);
  assignments.forEach(kw => {
    newCentroids[kw.cluster] += kw.score;
    counts[kw.cluster]++;
  });

  return assignments;
};

/**
 * Extract topics using TF-IDF + K-Means
 * @param {string} htmlContent - HTML content from Wikipedia
 * @param {number} numTopics - Number of topic clusters
 * @param {number} keywordsPerTopic - Keywords per topic
 * @returns {Array} Topics with keywords and scores
 */
export const extractTopicsTFIDF = (htmlContent, numTopics = 4, keywordsPerTopic = 6) => {
  // Parse HTML and extract text
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove script, style, and reference elements
  doc.querySelectorAll('script, style, .reference, .reflist, .navbox, .infobox, .sidebar').forEach(el => el.remove());

  // Get paragraphs as separate "documents" for better IDF
  const paragraphs = Array.from(doc.querySelectorAll('p'))
    .map(p => p.textContent.trim())
    .filter(text => text.length > 50);

  if (paragraphs.length === 0) {
    return [];
  }

  // Tokenize each paragraph
  const tokenizedDocs = paragraphs.map(p => tokenize(p));

  // Calculate IDF across paragraphs
  const idf = calculateIDF(tokenizedDocs);

  // Calculate TF-IDF for entire document
  const allTokens = tokenizedDocs.flat();
  const tfidf = calculateTFIDF(allTokens, idf);

  // Sort by TF-IDF score and get top keywords
  const sortedKeywords = Object.entries(tfidf)
    .map(([word, score]) => ({ word, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, numTopics * keywordsPerTopic * 2);

  // Cluster keywords into topics
  const clustered = kMeansCluster(sortedKeywords, numTopics);

  // Group by cluster
  const topics = [];
  for (let i = 0; i < numTopics; i++) {
    const clusterKeywords = clustered
      .filter(kw => kw.cluster === i)
      .slice(0, keywordsPerTopic);

    if (clusterKeywords.length > 0) {
      const avgScore = clusterKeywords.reduce((sum, kw) => sum + kw.score, 0) / clusterKeywords.length;
      topics.push({
        id: i + 1,
        name: `Topic ${i + 1}`,
        keywords: clusterKeywords.map(kw => kw.word),
        probability: Math.min(avgScore * 10, 1), // Normalize to 0-1
        representative: clusterKeywords[0]?.word || ''
      });
    }
  }

  // Sort topics by probability
  topics.sort((a, b) => b.probability - a.probability);

  // Rename topics based on top keyword
  topics.forEach((topic, i) => {
    if (topic.representative) {
      const capitalizedRep = topic.representative.charAt(0).toUpperCase() + topic.representative.slice(1);
      topic.name = capitalizedRep;
    }
  });

  return topics;
};


// ============================================================================
// TRANSFORMERS.JS APPROACH (Neural, higher quality)
// ============================================================================

let transformerPipeline = null;
let isLoadingTransformer = false;
let transformerLoadPromise = null;

/**
 * Check if Transformers.js is available
 */
export const isTransformersAvailable = () => {
  return typeof window !== 'undefined';
};

/**
 * Load the Transformers.js pipeline (lazy loading)
 */
export const loadTransformerModel = async (onProgress) => {
  if (transformerPipeline) {
    return transformerPipeline;
  }

  if (isLoadingTransformer && transformerLoadPromise) {
    return transformerLoadPromise;
  }

  isLoadingTransformer = true;

  transformerLoadPromise = (async () => {
    try {
      // Dynamically import transformers.js (official HuggingFace package)
      const { pipeline, env } = await import('@huggingface/transformers');

      // Configure for browser usage
      env.allowLocalModels = false;
      env.useBrowserCache = true;

      // Load a lightweight feature extraction model
      // all-MiniLM-L6-v2 is ~80MB and good for semantic similarity
      transformerPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          progress_callback: onProgress
        }
      );

      return transformerPipeline;
    } catch (error) {
      console.error('Failed to load transformer model:', error);
      throw error;
    } finally {
      isLoadingTransformer = false;
    }
  })();

  return transformerLoadPromise;
};

/**
 * Get transformer loading status
 */
export const getTransformerStatus = () => {
  if (transformerPipeline) return 'ready';
  if (isLoadingTransformer) return 'loading';
  return 'not_loaded';
};

/**
 * Compute cosine similarity between two vectors
 */
const cosineSimilarity = (a, b) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * K-Means clustering with embeddings
 */
const kMeansEmbeddings = (items, embeddings, k, maxIterations = 10) => {
  const n = items.length;
  if (n <= k) {
    return items.map((item, i) => ({ ...item, cluster: i }));
  }

  const dim = embeddings[0].length;

  // Initialize centroids randomly
  const indices = Array.from({ length: n }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, k);
  let centroids = indices.map(i => [...embeddings[i]]);

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign points to nearest centroid
    const newAssignments = embeddings.map(emb => {
      let maxSim = -Infinity;
      let bestCluster = 0;
      centroids.forEach((centroid, i) => {
        const sim = cosineSimilarity(emb, centroid);
        if (sim > maxSim) {
          maxSim = sim;
          bestCluster = i;
        }
      });
      return bestCluster;
    });

    // Check for convergence
    if (JSON.stringify(assignments) === JSON.stringify(newAssignments)) {
      break;
    }
    assignments = newAssignments;

    // Update centroids
    centroids = Array(k).fill(null).map(() => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);

    embeddings.forEach((emb, i) => {
      const cluster = assignments[i];
      counts[cluster]++;
      for (let d = 0; d < dim; d++) {
        centroids[cluster][d] += emb[d];
      }
    });

    centroids.forEach((centroid, i) => {
      if (counts[i] > 0) {
        for (let d = 0; d < dim; d++) {
          centroid[d] /= counts[i];
        }
      }
    });
  }

  return items.map((item, i) => ({ ...item, cluster: assignments[i] }));
};

/**
 * Extract topics using Transformers.js embeddings
 * @param {string} htmlContent - HTML content from Wikipedia
 * @param {number} numTopics - Number of topic clusters
 * @param {Function} onProgress - Progress callback for model loading
 * @returns {Promise<Array>} Topics with keywords and scores
 */
export const extractTopicsTransformer = async (htmlContent, numTopics = 4, onProgress = null) => {
  // Parse HTML and extract text
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove unwanted elements
  doc.querySelectorAll('script, style, .reference, .reflist, .navbox, .infobox, .sidebar').forEach(el => el.remove());

  // Extract sentences
  const text = doc.body?.textContent || '';
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 500)
    .slice(0, 50); // Limit for performance

  if (sentences.length === 0) {
    return [];
  }

  // Load model
  const extractor = await loadTransformerModel(onProgress);

  // Get embeddings for each sentence
  const embeddings = [];
  for (const sentence of sentences) {
    const output = await extractor(sentence, { pooling: 'mean', normalize: true });
    embeddings.push(Array.from(output.data));
  }

  // Cluster sentences
  const sentenceItems = sentences.map((text, i) => ({ text, index: i }));
  const clustered = kMeansEmbeddings(sentenceItems, embeddings, numTopics);

  // Extract keywords from each cluster
  const topics = [];
  for (let i = 0; i < numTopics; i++) {
    const clusterSentences = clustered
      .filter(item => item.cluster === i)
      .map(item => item.text);

    if (clusterSentences.length === 0) continue;

    // Extract keywords using TF-IDF within cluster
    const clusterText = clusterSentences.join(' ');
    const tokens = tokenize(clusterText);
    const tf = calculateTF(tokens);

    const keywords = Object.entries(tf)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word);

    if (keywords.length > 0) {
      topics.push({
        id: i + 1,
        name: keywords[0].charAt(0).toUpperCase() + keywords[0].slice(1),
        keywords,
        probability: clusterSentences.length / sentences.length,
        sentenceCount: clusterSentences.length,
        representative: clusterSentences[0]?.substring(0, 100) + '...'
      });
    }
  }

  // Sort by probability
  topics.sort((a, b) => b.probability - a.probability);

  return topics;
};

/**
 * Main topic extraction function - chooses method based on user preference
 */
export const extractTopics = async (htmlContent, method = 'tfidf', options = {}) => {
  const { numTopics = 4, onProgress = null } = options;

  if (method === 'transformer') {
    return extractTopicsTransformer(htmlContent, numTopics, onProgress);
  } else {
    return extractTopicsTFIDF(htmlContent, numTopics);
  }
};

// Topic colors for visualization
export const TOPIC_COLORS = [
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

/**
 * Extract sections from Wikipedia HTML with their text content
 * @param {string} htmlContent - HTML content from Wikipedia
 * @returns {Array} Array of sections with title, text, and level
 */
export const extractSections = (htmlContent) => {
  if (!htmlContent) return [];

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  // Remove unwanted elements
  doc.querySelectorAll('script, style, .reference, .reflist, .navbox, .infobox, .sidebar, .toc, .metadata').forEach(el => el.remove());

  const sections = [];

  // Get all heading elements (h2, h3)
  const headings = doc.querySelectorAll('h2, h3');

  // If no headings, treat entire content as one section
  if (headings.length === 0) {
    const allText = doc.body?.textContent?.trim() || '';
    if (allText) {
      sections.push({
        id: 'intro',
        title: 'Introduction',
        level: 1,
        text: allText.substring(0, 2000),
        element: null
      });
    }
    return sections;
  }

  // Extract intro (content before first h2)
  const firstH2 = doc.querySelector('h2');
  if (firstH2) {
    let introText = '';
    let node = doc.body?.firstChild;
    while (node && node !== firstH2 && !firstH2.contains(node)) {
      if (node.nodeType === Node.TEXT_NODE) {
        introText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Skip mw-heading divs (they contain the h2)
        if (!node.classList?.contains('mw-heading')) {
          introText += node.textContent || '';
        } else {
          break;
        }
      }
      node = node.nextSibling;
    }
    introText = introText.trim();
    if (introText.length > 50) {
      sections.push({
        id: 'intro',
        title: 'Introduction',
        level: 1,
        text: introText.substring(0, 2000)
      });
    }
  }

  // Process each heading
  headings.forEach((heading, index) => {
    const headingId = heading.id || heading.querySelector('[id]')?.id || `section-${index}`;
    const title = heading.textContent?.replace(/\[edit\]/g, '').trim() || '';

    // Skip certain sections
    const lowerTitle = title.toLowerCase();
    if (['see also', 'references', 'external links', 'notes', 'further reading', 'bibliography'].includes(lowerTitle)) {
      return;
    }

    const level = heading.tagName === 'H2' ? 2 : 3;

    // Find content container (mw-heading div parent or heading itself)
    const container = heading.closest('.mw-heading') || heading;

    // Collect text until next heading
    let sectionText = '';
    let sibling = container.nextElementSibling;

    while (sibling) {
      // Stop at next heading
      if (sibling.classList?.contains('mw-heading') ||
          sibling.tagName === 'H2' || sibling.tagName === 'H3') {
        break;
      }

      // Collect text from paragraphs, lists, etc.
      if (['P', 'UL', 'OL', 'DL', 'BLOCKQUOTE'].includes(sibling.tagName)) {
        sectionText += sibling.textContent + ' ';
      }

      sibling = sibling.nextElementSibling;
    }

    sectionText = sectionText.trim();
    if (sectionText.length > 20) {
      sections.push({
        id: headingId,
        title,
        level,
        text: sectionText.substring(0, 2000)
      });
    }
  });

  return sections;
};

/**
 * Assign topics to sections based on keyword matching
 * @param {Array} sections - Array of sections from extractSections
 * @param {Array} topics - Array of topics from topic extraction
 * @returns {Array} Sections with assigned topic colors and scores
 */
export const assignTopicsToSections = (sections, topics) => {
  if (!sections.length || !topics.length) return sections;

  return sections.map(section => {
    const sectionTokens = new Set(tokenize(section.text));

    // Score each topic by keyword overlap
    const topicScores = topics.map((topic, topicIndex) => {
      let matchCount = 0;
      topic.keywords.forEach(keyword => {
        if (sectionTokens.has(keyword.toLowerCase())) {
          matchCount++;
        }
      });
      return {
        topicIndex,
        topicId: topic.id,
        topicName: topic.name,
        score: matchCount / topic.keywords.length,
        color: TOPIC_COLORS[topicIndex % TOPIC_COLORS.length]
      };
    });

    // Sort by score and get top matches
    topicScores.sort((a, b) => b.score - a.score);

    // Assign primary topic (highest score)
    const primaryTopic = topicScores[0]?.score > 0 ? topicScores[0] : null;

    // Get secondary topics if they have significant overlap
    const secondaryTopics = topicScores
      .slice(1)
      .filter(t => t.score > 0.2)
      .slice(0, 2);

    return {
      ...section,
      primaryTopic,
      secondaryTopics,
      allTopicScores: topicScores
    };
  });
};

/**
 * Full topic analysis with section breakdown
 * @param {string} htmlContent - HTML content from Wikipedia
 * @param {string} method - 'tfidf' or 'transformer'
 * @param {Object} options - Options like numTopics, onProgress
 * @returns {Object} { topics, sections, sectionsWithTopics }
 */
export const analyzeTopicsWithSections = async (htmlContent, method = 'tfidf', options = {}) => {
  const { numTopics = 4, onProgress = null } = options;

  // Extract topics
  const topics = method === 'transformer'
    ? await extractTopicsTransformer(htmlContent, numTopics, onProgress)
    : extractTopicsTFIDF(htmlContent, numTopics);

  // Extract sections
  const sections = extractSections(htmlContent);

  // Assign topics to sections
  const sectionsWithTopics = assignTopicsToSections(sections, topics);

  return {
    topics,
    sections,
    sectionsWithTopics
  };
};

export default {
  extractTopicsTFIDF,
  extractTopicsTransformer,
  extractTopics,
  extractSections,
  assignTopicsToSections,
  analyzeTopicsWithSections,
  loadTransformerModel,
  getTransformerStatus,
  isTransformersAvailable,
  TOPIC_COLORS
};
