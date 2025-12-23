/**
 * Wikipedia API Service
 * Centralized API calls with caching, request cancellation, and parallel fetching
 */

// LRU Cache implementation
class LRUCache {
  constructor(maxSize = 50, ttlMs = 10 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key, data) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear() {
    this.cache.clear();
  }
}

// Cache instances
const contentCache = new LRUCache(50, 10 * 60 * 1000); // 10 min TTL
const thumbnailCache = new LRUCache(100, 60 * 60 * 1000); // 1 hour TTL
const searchCache = new LRUCache(30, 5 * 60 * 1000); // 5 min TTL

// Base API URL
const WIKI_API_BASE = 'https://en.wikipedia.org/w/api.php';

/**
 * Normalize a Wikipedia title for API calls
 */
const normalizeTitle = (title) => {
  return decodeURIComponent(title)
    .replace(/–/g, '-')
    .replace(/\s+/g, '_')
    .replace(/%/g, '%25');
};

/**
 * Fetch Wikipedia homepage content
 */
export const fetchHomePage = async (signal) => {
  try {
    const response = await fetch(
      `${WIKI_API_BASE}?action=parse&page=Main_Page&format=json&origin=*&prop=text`,
      { signal }
    );
    const data = await response.json();
    return data.parse?.text?.['*'] || null;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Error loading homepage:', error);
    return null;
  }
};

/**
 * Check if a page is a disambiguation, image, or regular article
 */
export const checkPageType = async (title, signal) => {
  try {
    const response = await fetch(
      `${WIKI_API_BASE}?action=query&prop=categories|pageprops&titles=${encodeURIComponent(title)}&format=json&origin=*`,
      { signal }
    );
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];

    if (page.pageprops?.disambiguation !== undefined) return 'disambiguation';
    if (page.categories?.some(cat =>
      cat.title.includes('Image:') ||
      cat.title.includes('File:') ||
      cat.title.includes('Category:Images')
    )) {
      return 'image';
    }
    return 'article';
  } catch (error) {
    if (error.name === 'AbortError') return 'unknown';
    console.error('Error checking page type:', error);
    return 'unknown';
  }
};

/**
 * Search Wikipedia with OpenSearch API
 */
export const searchWikipedia = async (query, signal) => {
  if (!query?.trim()) return [];

  // Check cache first
  const cached = searchCache.get(query);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${WIKI_API_BASE}?action=opensearch&search=${encodeURIComponent(query)}&format=json&origin=*`,
      { signal }
    );
    const [term, titles, descriptions, urls] = await response.json();
    const results = titles.map((title, i) => ({
      title,
      description: descriptions[i],
      url: urls[i]
    }));

    searchCache.set(query, results);
    return results;
  } catch (error) {
    if (error.name === 'AbortError') return [];
    console.error('Error searching Wikipedia:', error);
    return [];
  }
};

/**
 * Fetch Wikipedia page content
 */
export const fetchWikiContent = async (title, signal) => {
  const normalizedTitle = normalizeTitle(title);

  // Check cache first
  const cached = contentCache.get(normalizedTitle);
  if (cached) return cached;

  try {
    const response = await fetch(
      `${WIKI_API_BASE}?action=parse&page=${encodeURIComponent(normalizedTitle)}&format=json&origin=*&prop=text`,
      { signal }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.info || 'Wiki API error');
    }

    const content = data.parse?.text?.['*'];
    if (content) {
      contentCache.set(normalizedTitle, content);
      return content;
    }

    throw new Error('No content in response');
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Fetch error details:', error);
    return null;
  }
};

/**
 * Fetch Wikipedia page thumbnail
 */
export const fetchWikiThumbnail = async (title, signal) => {
  // Check cache first
  const cached = thumbnailCache.get(title);
  if (cached !== null && cached !== undefined) return cached;

  try {
    const response = await fetch(
      `${WIKI_API_BASE}?action=query&titles=${encodeURIComponent(title)}&prop=pageimages&format=json&origin=*&pithumbsize=100`,
      { signal }
    );
    const data = await response.json();
    const page = Object.values(data.query.pages)[0];
    const thumbnail = page.thumbnail?.source || null;

    thumbnailCache.set(title, thumbnail);
    return thumbnail;
  } catch (error) {
    if (error.name === 'AbortError') return null;
    console.error('Error fetching thumbnail:', error);
    return null;
  }
};

/**
 * Check if HTML content is a redirect page and extract target
 */
export const parseRedirectInfo = (htmlContent) => {
  if (!htmlContent) return null;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Check for redirect - Wikipedia redirect pages have specific structure
    const redirectMsg = doc.querySelector('.redirectMsg, .mw-redirect-text');
    if (redirectMsg) {
      const link = redirectMsg.querySelector('a');
      if (link) {
        return {
          isRedirect: true,
          targetTitle: link.textContent.trim(),
          targetUrl: link.getAttribute('href')
        };
      }
    }

    // Also check for "Redirect to:" text pattern
    const bodyText = doc.body?.textContent || '';
    if (bodyText.trim().startsWith('Redirect to:')) {
      const link = doc.querySelector('a[href*="/wiki/"]');
      if (link) {
        return {
          isRedirect: true,
          targetTitle: link.textContent.trim(),
          targetUrl: link.getAttribute('href')
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Load page content and thumbnail in parallel
 */
export const loadPageData = async (title, signal) => {
  const [content, thumbnail] = await Promise.all([
    fetchWikiContent(title, signal),
    fetchWikiThumbnail(title, signal)
  ]);

  // Check if this is a redirect page
  const redirectInfo = parseRedirectInfo(content);

  return { content, thumbnail, redirectInfo };
};

/**
 * Parse "See also" links from Wikipedia HTML content
 * Extracts real related article links from the article's "See also" section
 */
export const parseSeeAlsoLinks = (htmlContent) => {
  if (!htmlContent) return [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // Find "See also" section header - Wikipedia uses various structures
    // Try finding by mw-headline span first
    let seeAlsoHeader = Array.from(doc.querySelectorAll('.mw-headline'))
      .find(span => span.textContent.trim().toLowerCase() === 'see also');

    // If not found, try h2 directly
    if (!seeAlsoHeader) {
      seeAlsoHeader = Array.from(doc.querySelectorAll('h2'))
        .find(h2 => h2.textContent.toLowerCase().includes('see also'));
    }

    if (!seeAlsoHeader) return [];

    // Get the parent h2 if we found a span
    const h2 = seeAlsoHeader.tagName === 'H2' ? seeAlsoHeader : seeAlsoHeader.closest('h2');
    if (!h2) return [];

    // Find the next ul after the header (skip any divs or other elements)
    let sibling = h2.nextElementSibling;
    let attempts = 0;
    const maxAttempts = 5; // Don't search too far

    while (sibling && attempts < maxAttempts) {
      if (sibling.tagName === 'UL') break;
      if (sibling.tagName === 'H2' || sibling.tagName === 'H3') {
        // Hit another section, stop
        return [];
      }
      // Check for nested ul in divs (some Wikipedia templates)
      const nestedUl = sibling.querySelector('ul');
      if (nestedUl) {
        sibling = nestedUl;
        break;
      }
      sibling = sibling.nextElementSibling;
      attempts++;
    }

    if (!sibling || sibling.tagName !== 'UL') return [];

    // Extract links from the list
    const links = Array.from(sibling.querySelectorAll('li > a, li > i > a'))
      .filter(a => {
        const href = a.getAttribute('href') || '';
        // Only include wiki article links, not special pages
        return href.startsWith('/wiki/') &&
               !href.includes(':') &&
               !href.includes('#');
      })
      .slice(0, 8) // Limit to 8 suggestions
      .map(a => {
        const href = a.getAttribute('href') || '';
        const title = a.textContent.trim();
        // Extract the title from /wiki/Title_Here
        const wikiTitle = href.replace('/wiki/', '').replace(/_/g, ' ');
        return {
          title: title || decodeURIComponent(wikiTitle),
          url: `https://en.wikipedia.org${href}`
        };
      });

    return links;
  } catch (error) {
    console.error('Error parsing See also links:', error);
    return [];
  }
};

/**
 * Get related links for a page (combines See Also parsing)
 */
export const getRelatedLinks = async (title, content) => {
  // If we have content, parse See Also from it
  if (content) {
    const seeAlsoLinks = parseSeeAlsoLinks(content);
    if (seeAlsoLinks.length > 0) {
      return seeAlsoLinks;
    }
  }

  // If no See Also found, we could fetch content and try again
  // But for now, return empty to avoid extra API call
  return [];
};

/**
 * Clear all caches (useful for debugging or forced refresh)
 */
export const clearCaches = () => {
  contentCache.clear();
  thumbnailCache.clear();
  searchCache.clear();
};
