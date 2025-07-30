import { ChevronRight, ChevronDown } from 'lucide-react';

const MobileScrollHints = ({ pan, panLimits, zoom, className = "" }) => {
  // Calculate if there's more content in each direction
  const canScrollRight = pan.x > panLimits.minX + 10; // 10px threshold
  const canScrollDown = pan.y > panLimits.minY + 10;
  const canScrollLeft = pan.x < panLimits.maxX - 10;
  const canScrollUp = pan.y < panLimits.maxY - 10;

  if (!canScrollRight && !canScrollDown && !canScrollLeft && !canScrollUp) {
    return null; // No scrolling available
  }

  return (
    <div className={`fixed inset-0 pointer-events-none z-30 ${className}`}>
      {/* Right scroll hint */}
      {canScrollRight && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="bg-black/30 text-white rounded-full p-2 animate-pulse">
            <ChevronRight size={20} />
          </div>
        </div>
      )}
      
      {/* Down scroll hint */}
      {canScrollDown && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2">
          <div className="bg-black/30 text-white rounded-full p-2 animate-pulse">
            <ChevronDown size={20} />
          </div>
        </div>
      )}
      
      {/* Subtle edge gradients to indicate more content */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black/10 to-transparent" />
      )}
      
      {canScrollDown && (
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/10 to-transparent" />
      )}
    </div>
  );
};

export default MobileScrollHints;