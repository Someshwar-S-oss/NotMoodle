import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  if (!window.IntersectionObserver) {
    const MockIntersectionObserver = class IntersectionObserver {
      root = null;
      rootMargin = '';
      thresholds = [];
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    } as any;
    window.IntersectionObserver = MockIntersectionObserver;
    global.IntersectionObserver = MockIntersectionObserver;
  }

  if (!window.ResizeObserver) {
    const MockResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
    window.ResizeObserver = MockResizeObserver;
    global.ResizeObserver = MockResizeObserver;
  }
}
