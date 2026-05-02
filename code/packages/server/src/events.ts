import type { SyncEvent } from '@opennote/core';

type Listener = (e: SyncEvent) => void;

export class EventBus {
  private listeners = new Set<Listener>();

  emit(e: SyncEvent): void {
    for (const l of this.listeners) {
      try { l(e); } catch (err) { console.error('listener error', err); }
    }
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }
}
