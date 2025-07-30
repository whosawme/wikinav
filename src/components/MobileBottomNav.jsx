import { useState } from 'react';
import { ArrowLeft, Home, Share2, Menu } from 'lucide-react';

const MobileBottomNav = ({ 
  onBack, 
  onHome, 
  onNetworkView, 
  onShare, 
  onMenu,
  canGoBack,
  showNetworkView,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('tree');

  const handleTabClick = (tab, action) => {
    setActiveTab(tab);
    action?.();
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-1 py-2 z-40 safe-area-pb ${className}`}>
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => handleTabClick('back', onBack)}
          disabled={!canGoBack}
          className={`p-3 rounded-lg transition-all duration-200 ${
            canGoBack 
              ? 'text-blue-600 hover:bg-blue-50 active:bg-blue-100' 
              : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Go Back"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Home Button */}
        <button
          onClick={() => handleTabClick('home', onHome)}
          className={`p-3 rounded-lg transition-all duration-200 ${
            activeTab === 'home'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Home"
        >
          <Home size={20} />
        </button>

        {/* Network View Button */}
        <button
          onClick={() => handleTabClick('network', onNetworkView)}
          className={`p-3 rounded-lg transition-all duration-200 ${
            showNetworkView
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Network View"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="3" />
            <circle cx="5" cy="19" r="3" />
            <circle cx="19" cy="19" r="3" />
            <line x1="12" y1="8" x2="5" y2="16" />
            <line x1="12" y1="8" x2="19" y2="16" />
            <line x1="8" y1="19" x2="16" y2="19" />
          </svg>
        </button>

        {/* Share Button */}
        <button
          onClick={() => handleTabClick('share', onShare)}
          className={`p-3 rounded-lg transition-all duration-200 ${
            activeTab === 'share'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Share"
        >
          <Share2 size={20} />
        </button>

        {/* Menu Button */}
        <button
          onClick={() => handleTabClick('menu', onMenu)}
          className={`p-3 rounded-lg transition-all duration-200 ${
            activeTab === 'menu'
              ? 'text-blue-600 bg-blue-50'
              : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100'
          }`}
          title="Menu"
        >
          <Menu size={20} />
        </button>
      </div>
    </div>
  );
};

export default MobileBottomNav;