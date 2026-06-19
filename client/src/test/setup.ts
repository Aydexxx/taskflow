import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// @testing-library/react only auto-registers its afterEach(cleanup) when it
// detects a global `afterEach`. Our vitest config uses globals: false, so we
// register it explicitly to avoid DOM from one test leaking into the next.
afterEach(() => {
  cleanup();
});

// jsdom does not implement ResizeObserver, which @dnd-kit's DndContext uses
// to measure draggable/droppable nodes. A no-op stub is enough for tests
// that render the board without simulating real pointer drags.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
