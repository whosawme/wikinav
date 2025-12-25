/**
 * Analysis API Service
 * Handles communication with backend analysis services (BERTopic, similarity, etc.)
 */

const ANALYSIS_API_URL = import.meta.env.VITE_ANALYSIS_API_URL || 'http://localhost:5001';

/**
 * Extract topics from Wikipedia page content using BERTopic
 * @param {string} title - Wikipedia page title
 * @param {string} content - HTML content of the page
 * @returns {Promise<{topics: Array, error?: string}>}
 */
export const extractTopics = async (title, content) => {
  try {
    // Strip HTML tags to get plain text
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    const plainText = doc.body?.textContent || '';

    const response = await fetch(`${ANALYSIS_API_URL}/api/topics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        text: plainText.substring(0, 10000), // Limit text length
      }),
    });

    if (!response.ok) {
      throw new Error(`Topic extraction failed: ${response.status}`);
    }

    const data = await response.json();
    return { topics: data.topics || [] };
  } catch (error) {
    console.error('Topic extraction error:', error);
    return {
      topics: [],
      error: error.message,
    };
  }
};

/**
 * Compute similarity between articles using embeddings
 * @param {string} sourceTitle - Source article title
 * @param {Array<string>} targetTitles - Array of target article titles
 * @returns {Promise<{similarities: Array, error?: string}>}
 */
export const computeSimilarity = async (sourceTitle, targetTitles) => {
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/api/similarity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: sourceTitle,
        targets: targetTitles,
      }),
    });

    if (!response.ok) {
      throw new Error(`Similarity computation failed: ${response.status}`);
    }

    const data = await response.json();
    return { similarities: data.similarities || [] };
  } catch (error) {
    console.error('Similarity computation error:', error);
    return {
      similarities: [],
      error: error.message,
    };
  }
};

/**
 * Get entity vector from Wikipedia2Vec
 * @param {string} entity - Wikipedia entity/page title
 * @returns {Promise<{vector: Array, error?: string}>}
 */
export const getEntityVector = async (entity) => {
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/get_entity_vector/${encodeURIComponent(entity)}`);

    if (!response.ok) {
      throw new Error(`Failed to get entity vector: ${response.status}`);
    }

    const vector = await response.json();
    return { vector };
  } catch (error) {
    console.error('Entity vector error:', error);
    return {
      vector: null,
      error: error.message,
    };
  }
};

/**
 * Find most similar entities using Wikipedia2Vec
 * @param {string} entity - Wikipedia entity/page title
 * @param {number} limit - Maximum number of results
 * @returns {Promise<{similar: Array, error?: string}>}
 */
export const findSimilarEntities = async (entity, limit = 10) => {
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/most_similar/${encodeURIComponent(entity)}?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to find similar entities: ${response.status}`);
    }

    const similar = await response.json();
    return { similar };
  } catch (error) {
    console.error('Similar entities error:', error);
    return {
      similar: [],
      error: error.message,
    };
  }
};

/**
 * Check if the analysis backend is available
 * @returns {Promise<boolean>}
 */
export const isAnalysisBackendAvailable = async () => {
  try {
    const response = await fetch(`${ANALYSIS_API_URL}/health`, {
      method: 'GET',
      timeout: 3000,
    });
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  extractTopics,
  computeSimilarity,
  getEntityVector,
  findSimilarEntities,
  isAnalysisBackendAvailable,
};
