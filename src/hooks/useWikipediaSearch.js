import { useState, useEffect, useRef, useCallback } from 'react';
import { searchWikipedia } from '../services/wikipediaApi';
import { useDebounce } from './useDebounce';

/**
 * useWikipediaSearch - Hook for searching Wikipedia with debouncing and request cancellation
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 * @returns {Object} - { query, setQuery, results, isLoading, error, clearResults }
 */
export const useWikipediaSearch = (debounceMs = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // AbortController ref for cancelling in-flight requests
  const abortControllerRef = useRef(null);

  // Debounce the query
  const debouncedQuery = useDebounce(query, debounceMs);

  // Perform search when debounced query changes
  useEffect(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // If query is empty or starts with http (URL input), clear results
    if (!debouncedQuery.trim() || debouncedQuery.startsWith('http')) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const searchResults = await searchWikipedia(debouncedQuery, signal);
        // Only update if this request wasn't cancelled
        if (!signal.aborted) {
          setResults(searchResults);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setResults([]);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    performSearch();

    // Cleanup: cancel request on effect cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery]);

  // Clear results function
  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
  }, []);

  // Cancel pending search
  const cancelSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clearResults,
    cancelSearch
  };
};

export default useWikipediaSearch;
