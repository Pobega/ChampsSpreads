// Minimal reactive primitives shared by every island store/modal.
//
// Each store used to hand-roll the same `new Set()` of listeners + subscribe +
// notify, and each view re-implemented the same "force a re-render on notify"
// hook. createEmitter() and useSubscription() are the one copy of each.
//
// Imports straight from preact/hooks (not ./preact.js) on purpose: this is a
// leaf module, so the stores can depend on it without forming an import cycle
// with preact.js (which itself imports the calculator store).
import { useState, useLayoutEffect } from 'preact/hooks';

// A tiny pub-sub: subscribe() registers a listener and returns an unsubscribe
// fn (for useEffect cleanup); notify() re-runs every listener.
export function createEmitter() {
  const listeners = new Set();
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    notify() { listeners.forEach((l) => l()); },
  };
}

// Re-render the calling component whenever the given subscribe() fires. Uses
// useLayoutEffect so the subscription registers synchronously after mount
// (before paint), shrinking the window where an early notify() is missed.
export function useSubscription(subscribe) {
  const [, force] = useState(0);
  useLayoutEffect(() => subscribe(() => force((n) => n + 1)), []);
}
