import React, { useState, useRef, useCallback } from 'react';
import { ChevronUp } from 'lucide-react';

const NodeShelf = ({ activePage, pages, onNodeSelect, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const shelfRef = useRef(null);
  const dragStartY = useRef(0);
  const dragStartOpen = useRef(false);

  const COLLAPSED_HEIGHT = 48;
  const OPEN_HEIGHT = isMobile ? 300 : 340;

  const handlePointerDown = useCallback((clientY) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartOpen.current = isOpen;
    setDragY(0);
  }, [isOpen]);

  const handlePointerMove = useCallback((clientY) => {
    if (!isDragging) return;
    setDragY(clientY - dragStartY.current);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = 40;
    if (dragStartOpen.current) {
      if (dragY > threshold) setIsOpen(false);
    } else {
      if (dragY < -threshold) setIsOpen(true);
    }
    setDragY(0);
  }, [isDragging, dragY]);

  // Compute visual translation for drag feedback
  const translateY = (() => {
    if (!isDragging) return 0;
    if (isOpen) {
      return Math.max(0, Math.min(dragY, OPEN_HEIGHT - COLLAPSED_HEIGHT));
    } else {
      return Math.min(0, Math.max(dragY, -(OPEN_HEIGHT - COLLAPSED_HEIGHT)));
    }
  })();

  const currentHeight = isOpen
    ? OPEN_HEIGHT - translateY
    : COLLAPSED_HEIGHT - translateY;

  const seeAlsoLinks = activePage?.seeAlso || [];
  const parentPage = activePage ? pages.find(p => p.children?.includes(activePage.id)) : null;
  const childPages = activePage ? pages.filter(p => activePage.children?.includes(p.id)) : [];

  return (
    // Outer wrapper: pointer-events none so touches pass through to elements below
    <div
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ pointerEvents: 'none' }}
    >
      {/* Actual shelf card: pointer-events auto so it's interactive */}
      <div
        ref={shelfRef}
        className="bg-slate-900/95 backdrop-blur-md rounded-t-2xl border-t border-slate-700 shadow-2xl flex flex-col overflow-hidden"
        style={{
          height: `${currentHeight}px`,
          transition: isDragging ? 'none' : 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto',
        }}
      >
        {/* Drag handle area */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
          onMouseDown={(e) => { e.stopPropagation(); handlePointerDown(e.clientY); }}
          onMouseMove={(e) => { if (isDragging) handlePointerMove(e.clientY); }}
          onMouseUp={handlePointerUp}
          onTouchStart={(e) => { e.stopPropagation(); handlePointerDown(e.touches[0].clientY); }}
          onTouchMove={(e) => { if (isDragging) handlePointerMove(e.touches[0].clientY); }}
          onTouchEnd={handlePointerUp}
          onClick={(e) => { e.stopPropagation(); setIsOpen(prev => !prev); }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-600" />
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {activePage?.thumbnail && (
                <img
                  src={activePage.thumbnail}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 border border-slate-600"
                />
              )}
              <span className="text-white font-medium text-sm truncate">
                {activePage?.title || 'No page selected'}
              </span>
            </div>
            <ChevronUp
              size={16}
              className={`text-slate-400 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>

        {/* Expanded content */}
        {isOpen && (
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {/* Connected pages */}
            {(parentPage || childPages.length > 0) && (
              <div className="mb-3">
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Graph connections</div>
                <div className="flex flex-wrap gap-1.5">
                  {parentPage && (
                    <button
                      onClick={() => onNodeSelect(parentPage)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      {parentPage.thumbnail && (
                        <img src={parentPage.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <span className="text-xs text-blue-300 truncate max-w-[120px]">{parentPage.title}</span>
                      <span className="text-[9px] text-slate-500">parent</span>
                    </button>
                  )}
                  {childPages.map(child => (
                    <button
                      key={child.id}
                      onClick={() => onNodeSelect(child)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                    >
                      {child.thumbnail && (
                        <img src={child.thumbnail} alt="" className="w-4 h-4 rounded-full object-cover" />
                      )}
                      <span className="text-xs text-slate-300 truncate max-w-[120px]">{child.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* See Also links */}
            {seeAlsoLinks.length > 0 && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Related pages</div>
                <div className="flex flex-wrap gap-1.5">
                  {seeAlsoLinks.map((link, i) => (
                    <button
                      key={i}
                      onClick={() => onNodeSelect({ title: link.title, url: link.url })}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-blue-900/40 border border-slate-700/50 hover:border-blue-600/50 transition-colors"
                    >
                      <span className="text-xs text-slate-300">{link.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!parentPage && childPages.length === 0 && seeAlsoLinks.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">
                No related pages available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NodeShelf;
