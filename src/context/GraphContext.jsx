import React, { createContext, useContext, useReducer, useCallback } from 'react';

/**
 * GraphContext - Centralized state management for the wiki navigation graph
 * Replaces the 25+ useState hooks in WikiNavTree.jsx
 */

// Initial state
const initialState = {
  pages: [],
  activePage: null,
  navigationHistory: [],
  historyIndex: -1,
  wikiContent: '',
  loading: false,
  zoom: 1,
  pan: { x: 0, y: 0 },
  isSplayed: false,
  showSeeAlso: false,
  seeAlsoNodes: [],
  showNetworkView: false,
  treePaneMode: 'normal', // 'collapsed', 'normal', 'expanded'
};

// Action types
const ActionTypes = {
  SET_PAGES: 'SET_PAGES',
  ADD_PAGE: 'ADD_PAGE',
  UPDATE_PAGE: 'UPDATE_PAGE',
  SET_ACTIVE_PAGE: 'SET_ACTIVE_PAGE',
  SET_WIKI_CONTENT: 'SET_WIKI_CONTENT',
  SET_LOADING: 'SET_LOADING',
  SET_ZOOM: 'SET_ZOOM',
  SET_PAN: 'SET_PAN',
  SET_SPLAYED: 'SET_SPLAYED',
  SET_SHOW_SEE_ALSO: 'SET_SHOW_SEE_ALSO',
  SET_SEE_ALSO_NODES: 'SET_SEE_ALSO_NODES',
  SET_SHOW_NETWORK_VIEW: 'SET_SHOW_NETWORK_VIEW',
  SET_TREE_PANE_MODE: 'SET_TREE_PANE_MODE',
  NAVIGATE_BACK: 'NAVIGATE_BACK',
  NAVIGATE_FORWARD: 'NAVIGATE_FORWARD',
  PUSH_HISTORY: 'PUSH_HISTORY',
  RESET_GRAPH: 'RESET_GRAPH',
};

// Reducer
function graphReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_PAGES:
      return { ...state, pages: action.payload };

    case ActionTypes.ADD_PAGE: {
      const newPage = action.payload;
      const updatedPages = [...state.pages, newPage];

      // Add parent-child relationship if there's an active page
      if (state.activePage && newPage.parent_id !== "0") {
        const parentIndex = updatedPages.findIndex(p => p.id === state.activePage.id);
        if (parentIndex !== -1) {
          updatedPages[parentIndex] = {
            ...updatedPages[parentIndex],
            children: [...(updatedPages[parentIndex].children || []), newPage.id]
          };
        }
      }

      return { ...state, pages: updatedPages };
    }

    case ActionTypes.UPDATE_PAGE: {
      const { id, updates } = action.payload;
      return {
        ...state,
        pages: state.pages.map(page =>
          page.id === id ? { ...page, ...updates } : page
        )
      };
    }

    case ActionTypes.SET_ACTIVE_PAGE:
      return { ...state, activePage: action.payload };

    case ActionTypes.SET_WIKI_CONTENT:
      return { ...state, wikiContent: action.payload };

    case ActionTypes.SET_LOADING:
      return { ...state, loading: action.payload };

    case ActionTypes.SET_ZOOM:
      return { ...state, zoom: action.payload };

    case ActionTypes.SET_PAN:
      return { ...state, pan: action.payload };

    case ActionTypes.SET_SPLAYED:
      return { ...state, isSplayed: action.payload };

    case ActionTypes.SET_SHOW_SEE_ALSO:
      return { ...state, showSeeAlso: action.payload };

    case ActionTypes.SET_SEE_ALSO_NODES:
      return { ...state, seeAlsoNodes: action.payload };

    case ActionTypes.SET_SHOW_NETWORK_VIEW:
      return { ...state, showNetworkView: action.payload };

    case ActionTypes.SET_TREE_PANE_MODE:
      return { ...state, treePaneMode: action.payload };

    case ActionTypes.NAVIGATE_BACK: {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      const previousPage = state.navigationHistory[newIndex];
      return {
        ...state,
        historyIndex: newIndex,
        activePage: previousPage,
        wikiContent: previousPage.content,
      };
    }

    case ActionTypes.NAVIGATE_FORWARD: {
      if (state.historyIndex >= state.navigationHistory.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      const nextPage = state.navigationHistory[newIndex];
      return {
        ...state,
        historyIndex: newIndex,
        activePage: nextPage,
        wikiContent: nextPage.content,
      };
    }

    case ActionTypes.PUSH_HISTORY: {
      const page = action.payload;
      // Don't add if it's the same as current
      if (state.navigationHistory[state.historyIndex]?.id === page.id) {
        return state;
      }
      const newHistory = [...state.navigationHistory.slice(0, state.historyIndex + 1), page];
      return {
        ...state,
        navigationHistory: newHistory,
        historyIndex: newHistory.length - 1,
      };
    }

    case ActionTypes.RESET_GRAPH:
      return {
        ...initialState,
        // Preserve some settings
        treePaneMode: state.treePaneMode,
      };

    default:
      return state;
  }
}

// Context
const GraphContext = createContext(null);

// Provider component
export function GraphProvider({ children }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  // Action creators with useCallback for stability
  const setPages = useCallback((pages) => {
    dispatch({ type: ActionTypes.SET_PAGES, payload: pages });
  }, []);

  const addPage = useCallback((page) => {
    dispatch({ type: ActionTypes.ADD_PAGE, payload: page });
  }, []);

  const updatePage = useCallback((id, updates) => {
    dispatch({ type: ActionTypes.UPDATE_PAGE, payload: { id, updates } });
  }, []);

  const setActivePage = useCallback((page) => {
    dispatch({ type: ActionTypes.SET_ACTIVE_PAGE, payload: page });
    if (page) {
      dispatch({ type: ActionTypes.PUSH_HISTORY, payload: page });
      dispatch({ type: ActionTypes.SET_WIKI_CONTENT, payload: page.content });
    }
  }, []);

  const setWikiContent = useCallback((content) => {
    dispatch({ type: ActionTypes.SET_WIKI_CONTENT, payload: content });
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
  }, []);

  const setZoom = useCallback((zoom) => {
    dispatch({ type: ActionTypes.SET_ZOOM, payload: zoom });
  }, []);

  const setPan = useCallback((pan) => {
    dispatch({ type: ActionTypes.SET_PAN, payload: pan });
  }, []);

  const setSplayed = useCallback((splayed) => {
    dispatch({ type: ActionTypes.SET_SPLAYED, payload: splayed });
  }, []);

  const setShowSeeAlso = useCallback((show) => {
    dispatch({ type: ActionTypes.SET_SHOW_SEE_ALSO, payload: show });
  }, []);

  const setSeeAlsoNodes = useCallback((nodes) => {
    dispatch({ type: ActionTypes.SET_SEE_ALSO_NODES, payload: nodes });
  }, []);

  const setShowNetworkView = useCallback((show) => {
    dispatch({ type: ActionTypes.SET_SHOW_NETWORK_VIEW, payload: show });
  }, []);

  const setTreePaneMode = useCallback((mode) => {
    dispatch({ type: ActionTypes.SET_TREE_PANE_MODE, payload: mode });
  }, []);

  const navigateBack = useCallback(() => {
    dispatch({ type: ActionTypes.NAVIGATE_BACK });
  }, []);

  const navigateForward = useCallback(() => {
    dispatch({ type: ActionTypes.NAVIGATE_FORWARD });
  }, []);

  const resetGraph = useCallback(() => {
    dispatch({ type: ActionTypes.RESET_GRAPH });
  }, []);

  const value = {
    // State
    ...state,

    // Actions
    setPages,
    addPage,
    updatePage,
    setActivePage,
    setWikiContent,
    setLoading,
    setZoom,
    setPan,
    setSplayed,
    setShowSeeAlso,
    setSeeAlsoNodes,
    setShowNetworkView,
    setTreePaneMode,
    navigateBack,
    navigateForward,
    resetGraph,
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
}

// Custom hook for accessing context
export function useGraph() {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
}

export { ActionTypes };
export default GraphContext;
