"use client";

import { Component, createRef, type ReactNode } from "react";

export type ReadingAnchor = { id: string; top: number };
export function captureReadingAnchor(root: HTMLElement | null): ReadingAnchor | null {
  if (!root) return null;
  const candidates = [...root.querySelectorAll<HTMLElement>("[data-reading-anchor]")]
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.height > 0 && rect.bottom > 112 && rect.top < window.innerHeight);
  const anchor = candidates.find(({ rect }) => rect.top <= 128 && rect.bottom > 128) ?? candidates[0];
  if (anchor) return { id: anchor.element.id, top: anchor.rect.top };
  const active = root.querySelector<HTMLElement>('[data-reader-active="true"] [data-reading-anchor]');
  return active ? { id: active.id, top: 112 } : null;
}
export function restoreReadingAnchor(anchor: ReadingAnchor | null) {
  if (!anchor) return;
  const element = document.getElementById(anchor.id);
  if (!element || !element.getBoundingClientRect().height) return;
  const delta = element.getBoundingClientRect().top - anchor.top;
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "instant" });
}

/** Capture before DOM changes; follow sidebar reflow briefly, cancelling on user input. */
export class ReadingPositionBoundary extends Component<{ layout: string; children: ReactNode }, object, ReadingAnchor | null> {
  private root = createRef<HTMLDivElement>();
  private observer?: ResizeObserver;
  private lock: { anchor: ReadingAnchor; until: number } | null = null;
  private cancel = () => { this.lock = null; };
  componentDidMount() {
    this.observer = new ResizeObserver(() => {
      if (this.lock && performance.now() < this.lock.until) restoreReadingAnchor(this.lock.anchor);
      else this.lock = null;
    });
    if (this.root.current) this.observer.observe(this.root.current);
    window.addEventListener("wheel", this.cancel, { passive: true });
    window.addEventListener("touchstart", this.cancel, { passive: true });
    window.addEventListener("keydown", this.cancel);
    window.addEventListener("pointerdown", this.cancel, { passive: true });
  }
  getSnapshotBeforeUpdate(previous: Readonly<{ layout: string; children: ReactNode }>) {
    return previous.layout !== this.props.layout ? captureReadingAnchor(this.root.current) : null;
  }
  componentDidUpdate(_previous: unknown, _state: unknown, anchor?: ReadingAnchor | null) {
    if (anchor) { this.lock = { anchor, until: performance.now() + 400 }; restoreReadingAnchor(anchor); }
  }
  componentWillUnmount() {
    this.observer?.disconnect();
    window.removeEventListener("wheel", this.cancel);
    window.removeEventListener("touchstart", this.cancel);
    window.removeEventListener("keydown", this.cancel);
    window.removeEventListener("pointerdown", this.cancel);
  }
  render() { return <div ref={this.root} style={{ overflowAnchor: "none" }}>{this.props.children}</div>; }
}
