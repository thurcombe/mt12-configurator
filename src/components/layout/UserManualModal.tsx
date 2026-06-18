import { useEffect, useMemo, useRef, useState } from 'react';
import { marked, Renderer } from 'marked';
import manualRaw from '../../../docs/user-manual.md?raw';
import css from './UserManualModal.module.css';

interface Props {
  onClose: () => void;
}

interface TocEntry {
  id: string;
  text: string;
  level: number;
}

function buildToc(html: string): TocEntry[] {
  const entries: TocEntry[] = [];
  const re = /<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)<\/h[23]>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    entries.push({ level: parseInt(m[1], 10), id: m[2], text: m[3].replace(/<[^>]+>/g, '') });
  }
  return entries;
}

function buildRenderer(): Renderer {
  const renderer = new Renderer();
  renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
    const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
    return `<h${depth} id="${id}">${text}</h${depth}>\n`;
  };
  return renderer;
}

export function UserManualModal({ onClose }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string>('');
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  const html = useMemo(() => marked(manualRaw, { renderer: buildRenderer() }) as string, []);
  const toc = useMemo(() => buildToc(html), [html]);

  // Highlight the active TOC entry as the user scrolls.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const headings = Array.from(el.querySelectorAll('h2, h3'));
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActiveId((e.target as HTMLElement).id); },
      { root: el, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [html]);

  // Wire up image click → lightbox.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    function handleClick(e: MouseEvent) {
      const img = (e.target as HTMLElement).closest('img') as HTMLImageElement | null;
      if (img) setLightbox({ src: img.src, alt: img.alt });
    }
    el.addEventListener('click', handleClick);
    return () => el.removeEventListener('click', handleClick);
  }, [html]);

  // Esc closes the lightbox (or the modal if no lightbox is open).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (lightbox) setLightbox(null);
      else onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightbox, onClose]);

  function scrollTo(id: string) {
    contentRef.current?.querySelector(`[id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'stretch', justifyContent: 'center', zIndex: 1000, padding: '20px' }}
        onClick={onClose}
      >
        <div
          style={{ background: 'var(--bg)', borderRadius: 8, display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 1100, maxHeight: '100%', overflow: 'hidden', border: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>User Manual</h2>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>EdgeTX MT12 Config Editor</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              <a href="https://manual.edgetx.org/" target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
                EdgeTX docs ↗
              </a>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 16, padding: '2px 8px' }}>✕</button>
            </div>
          </div>

          {/* Body: TOC + content */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* TOC sidebar */}
            <nav style={{ width: 220, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--border)', padding: '16px 0' }}>
              {toc.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => scrollTo(entry.id)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
                    padding: entry.level === 2 ? '5px 16px' : '3px 16px 3px 28px',
                    fontSize: entry.level === 2 ? 12 : 11,
                    fontWeight: entry.level === 2 ? 600 : 400,
                    color: activeId === entry.id ? 'var(--accent)' : 'var(--text-muted)',
                    borderLeft: activeId === entry.id ? '2px solid var(--accent)' : '2px solid transparent',
                    lineHeight: 1.4,
                  }}
                >
                  {entry.text}
                </button>
              ))}
            </nav>

            {/* Manual content */}
            <div
              ref={contentRef}
              className={css.prose}
              style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 24, cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 8px 48px rgba(0,0,0,0.6)', objectFit: 'contain' }}
          />
        </div>
      )}
    </>
  );
}
