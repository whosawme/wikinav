import { useState } from 'react';
import { ArrowLeft, Home, Share2, Menu, Rabbit } from 'lucide-react';

const MobileBottomNav = ({
  onBack,
  onHome,
  onNetworkView,
  onShare,
  onMenu,
  onReset,
  onFitGraph,
  onExport,
  onRabbitHole,
  canGoBack,
  showNetworkView,
  showRabbitHole,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('tree');

  const handleTabClick = (tab, action) => {
    setActiveTab(tab);
    action?.();
  };

  return (
    <div className={`fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-1 py-1 z-40 safe-area-pt ${className}`}>
      <div className="flex items-center justify-around">
        {/* WikiRabbit Icon */}
        <div className="p-2">
          <img 
            src="/wikirabbit_transparent.svg" 
            alt="WikiNav" 
            className="h-6 w-6"
          />
        </div>

        {/* Back Button */}
        <button
          onClick={() => handleTabClick('back', onBack)}
          disabled={!canGoBack}
          className={`p-2 rounded-lg transition-all duration-200 ${
            canGoBack 
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Go Back"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Reset Button */}
        <button
          onClick={() => handleTabClick('reset', onReset)}
          className="p-2 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          title="Reset Tree"
        >
          <Home size={16} />
        </button>

        {/* Fit Graph Button */}
        <button
          onClick={() => handleTabClick('fit', onFitGraph)}
          className="p-2 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          title="Fit to View"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h4v4" />
            <path d="M3 21h4v-4" />
            <path d="M21 3h-4v4" />
            <path d="M21 21h-4v-4" />
            <circle cx="12" cy="12" r="1" fill="currentColor" />
          </svg>
        </button>

        {/* Network View Button */}
        <button
          onClick={() => handleTabClick('network', onNetworkView)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            showNetworkView
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Network View"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="3" />
            <circle cx="5" cy="19" r="3" />
            <circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" />
            <line x1="12" y1="8" x2="19" y2="16" />
            <line x1="8" y1="19" x2="16" y2="19" />
          </svg>
        </button>

        {/* Rabbit Hole Button */}
        <button
          onClick={() => handleTabClick('rabbit', onRabbitHole)}
          className={`p-2 rounded-lg transition-all duration-200 ${
            showRabbitHole
              ? 'text-purple-600 bg-purple-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Rabbit Hole"
        >
          <Rabbit size={16} />
        </button>

        {/* Share Button */}
        <button
          onClick={() => handleTabClick('share', onShare)}
          className="p-2 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          title="Share"
        >
          <Share2 size={16} />
        </button>

        {/* Export Button */}
        <button
          onClick={() => handleTabClick('export', onExport)}
          className="p-2 rounded-lg transition-all duration-200 text-gray-600 hover:bg-gray-50 active:bg-gray-100"
          title="Export"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7,10 12,15 17,10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default MobileBottomNav;