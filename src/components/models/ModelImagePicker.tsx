import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore.ts';
import type { ModelKey } from '../../store/useEditorStore.ts';
import { listImagesInDir } from '../../fs/sdcard.ts';
import css from './ModelImagePicker.module.css';

interface Props {
  modelKey: ModelKey;
}

const ITEM_WIDTH = 95;  // 90px thumb + 5px gap
const VERT_EXPAND = 30; // extra px above/below for 2× scale of 60px thumb
const NAV_SPACE = 56;   // 2 × (24px button + 4px gap), always reserved

export function ModelImagePicker({ modelKey }: Props) {
  const uploadModelImage = useEditorStore((s) => s.uploadModelImage);
  const imageUrl = useEditorStore((s) => s.modelImages[modelKey]);
  const sdRoot = useEditorStore((s) => s.sdRoot);
  const [sdImages, setSdImages] = useState<Array<{ filename: string; url: string }>>([]);
  const [scrollIdx, setScrollIdx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sdRoot) return;
    listImagesInDir(sdRoot, 'IMAGES/library').then(setSdImages);
  }, [sdRoot]);

  useEffect(() => { setScrollIdx(0); }, [sdImages]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    const update = () => {
      const available = el.clientWidth - NAV_SPACE;
      setVisibleCount(Math.max(1, Math.floor(available / ITEM_WIDTH)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sdImages.length]);

  const maxScrollIdx = Math.max(0, sdImages.length - visibleCount);
  const clampedIdx = Math.min(scrollIdx, maxScrollIdx);
  const shownCount = Math.min(visibleCount, sdImages.length);
  const trackWidth = shownCount * ITEM_WIDTH - 5;
  const lastVisible = Math.min(clampedIdx + visibleCount - 1, sdImages.length - 1);

  function scrollThumbs(dir: -1 | 1) {
    setScrollIdx((prev) => Math.max(0, Math.min(prev + dir, maxScrollIdx)));
  }

  return (
    <div className={css.picker}>
      <div className={css.uploadRow}>
        {imageUrl && <img src={imageUrl} alt="Model" className={css.previewThumb} />}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            uploadModelImage(modelKey, file);
            e.target.value = '';
          }}
        />
        <button className="btn btn-ghost btn-sm" onClick={() => imageInputRef.current?.click()}>
          Upload from device
        </button>
      </div>

      {sdImages.length > 0 && (
        <div ref={carouselRef} className={css.carousel}>
          <button
            className={css.navBtn}
            disabled={clampedIdx === 0}
            onClick={() => scrollThumbs(-1)}
          >‹</button>

          {/*
            overflow:hidden clips layout overflow (prevents page scrollbar).
            padding VERT_EXPAND top/bottom moves the overflow boundary outward so
            the 2× scaled thumb (120px) fits within the 120px padded height.
            Negative margin collapses apparent height back to 60px for the flex row.
          */}
          <div style={{
            width: trackWidth,
            overflow: 'hidden',
            padding: `${VERT_EXPAND}px 0`,
            margin: `-${VERT_EXPAND}px 0`,
            boxSizing: 'content-box',
          }}>
            <div
              className={css.track}
              style={{ transform: `translateX(-${clampedIdx * ITEM_WIDTH}px)` }}
            >
              {sdImages.map((img, i) => {
                const selected = imageUrl === img.url;
                const origin =
                  i === clampedIdx && i === lastVisible ? 'center center'
                  : i === clampedIdx   ? 'left center'
                  : i === lastVisible  ? 'right center'
                  : 'center center';
                return (
                  <button
                    key={img.filename}
                    className={`${css.thumb}${selected ? ` ${css.thumbSelected}` : ''}`}
                    title={img.filename}
                    style={{ transformOrigin: origin }}
                    onClick={async () => {
                      const resp = await fetch(img.url);
                      const blob = await resp.blob();
                      const file = new File([blob], img.filename, { type: blob.type });
                      uploadModelImage(modelKey, file);
                    }}
                  >
                    <img src={img.url} alt={img.filename} />
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className={css.navBtn}
            disabled={clampedIdx >= maxScrollIdx}
            onClick={() => scrollThumbs(1)}
          >›</button>
        </div>
      )}
    </div>
  );
}
