import { useState, useEffect, useRef, useMemo } from 'react';

interface VirtualizedListConfig {
  itemHeight: number;
  overscan?: number;
  containerHeight?: number;
}

/**
 * Hook for virtualizing large lists to improve rendering performance
 * Only renders items visible in the viewport + overscan
 */
export function useVirtualizedList<T>(
  items: T[],
  config: VirtualizedListConfig
) {
  const { itemHeight, overscan = 3, containerHeight = 600 } = config;
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { visibleRange, totalHeight, offsetY } = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return {
      visibleRange: { start, end },
      totalHeight: items.length * itemHeight,
      offsetY: start * itemHeight,
    };
  }, [items.length, itemHeight, scrollTop, containerHeight, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    scrollTop,
  };
}
