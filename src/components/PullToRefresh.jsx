import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ pullDistance, isRefreshing, threshold = 80 }) => {
  const opacity = Math.min(pullDistance / threshold, 1);
  const rotation = isRefreshing ? 360 : (pullDistance / threshold) * 180;
  
  return (
    <div 
      className="fixed top-0 left-0 right-0 flex justify-center items-center z-50 pointer-events-none"
      style={{
        transform: `translateY(${Math.min(pullDistance - 60, 20)}px)`,
        opacity: opacity
      }}
    >
      <div className="bg-white rounded-full shadow-lg p-3 border border-gray-200">
        <RefreshCw 
          size={24} 
          className={`text-blue-600 transition-transform duration-300 ${
            isRefreshing ? 'animate-spin' : ''
          }`}
          style={{
            transform: isRefreshing ? 'rotate(360deg)' : `rotate(${rotation}deg)`
          }}
        />
      </div>
    </div>
  );
};

export default PullToRefresh;