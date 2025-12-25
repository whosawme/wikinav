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
    let sectionContainer = null;

    // Method 1: Modern Wikipedia structure - h2 with id inside mw-heading div
    const h2WithId = doc.querySelector('h2#See_also, h2[id="See_also"]');
    if (h2WithId) {
      // The h2 is inside a div.mw-heading, we need to get that div's siblings
      sectionContainer = h2WithId.closest('.mw-heading') || h2WithId.parentElement;
    }

    // Method 2: Try finding by mw-headline span (older Wikipedia HTML structure)
    if (!sectionContainer) {
      const headlineSpan = doc.querySelector('#See_also, #See_Also, .mw-headline#See_also');
      if (headlineSpan) {
        const h2 = headlineSpan.closest('h2');
        sectionContainer = h2?.closest('.mw-heading') || h2;
      }
    }

    // Method 3: Search all h2 elements by text content
    if (!sectionContainer) {
      const allH2s = Array.from(doc.querySelectorAll('h2'));
      for (const h2 of allH2s) {
        if (h2.textContent.toLowerCase().includes('see also')) {
          sectionContainer = h2.closest('.mw-heading') || h2;
          break;
        }
      }
    }

    if (!sectionContainer) {
      console.log('[parseSeeAlsoLinks] No See Also section found');
      return [];
    }

    // Find the list of links after the section header
    // Look at siblings of the container element
    let sibling = sectionContainer.nextElementSibling;
    let attempts = 0;
    const maxAttempts = 10;
    let ulElement = null;

    while (sibling && attempts < maxAttempts) {
      // Stop if we hit another section heading
      if (sibling.classList?.contains('mw-heading') ||
          sibling.tagName === 'H2' ||
          (sibling.tagName === 'DIV' && sibling.querySelector('h2'))) {
        break;
      }

      // Direct ul element
      if (sibling.tagName === 'UL') {
        ulElement = sibling;
        break;
      }

      // Check for ul inside div wrappers (div-col, etc.)
      const nestedUl = sibling.querySelector('ul');
      if (nestedUl) {
        ulElement = nestedUl;
        break;
      }

      sibling = sibling.nextElementSibling;
      attempts++;
    }

    if (!ulElement) {
      console.log('[parseSeeAlsoLinks] No ul element found after See Also header');
      return [];
    }

    // Extract links from the list - get the first link from each list item
    const links = [];
    const listItems = ulElement.querySelectorAll('li');

    for (const li of listItems) {
      // Get the first wiki link in this list item
      const firstLink = li.querySelector('a[href^="/wiki/"]');
      if (!firstLink) continue;

      const href = firstLink.getAttribute('href') || '';

      // Skip special pages (those with colons like File:, Category:, etc.)
      if (href.includes(':')) continue;

      const title = firstLink.textContent.trim();
      if (!title) continue;

      // Avoid duplicates
      if (links.some(l => l.title === title)) continue;

      links.push({
        title,
        url: `https://en.wikipedia.org${href}`
      });

      // Limit to 12 suggestions
      if (links.length >= 12) break;
    }

    console.log('[parseSeeAlsoLinks] Found', links.length, 'links');
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
