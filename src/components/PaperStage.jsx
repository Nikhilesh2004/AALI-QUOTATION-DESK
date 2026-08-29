import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const A4_W = (210 * 96) / 25.4; // 793.7px
const A4_H = (297 * 96) / 25.4; // 1122.5px

/**
 * Holds the A4 sheet, scales it to the available width, and measures whether
 * the content still fits on one page.
 *
 * The measurement is the reason this component exists. The sheet is a fixed
 * 297mm box with overflow hidden, so anything that overruns is silently
 * clipped -- exactly the failure that would otherwise be discovered at the
 * printer. To find the natural height we briefly release the fixed height and
 * the footer's margin-top:auto, read the content height, and restore. Reading
 * a layout property forces a synchronous reflow, so the value is correct in
 * the same frame and never flickers.
 */
export default function PaperStage({ children, onFit }) {
  const scrollerRef = useRef(null);
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [fit, setFit] = useState(null);
  const lastFit = useRef(null);

  const fitToPane = useCallback(() => {
    const pane = scrollerRef.current;
    if (!pane) return;
    setScale(Math.min(1, (pane.clientWidth - 44) / A4_W));
  }, []);

  const measure = useCallback(() => {
    const paper = wrapRef.current?.querySelector('.paper');
    const sheet = paper?.querySelector('.sheet');
    if (!paper || !sheet) return;

    const avail = sheet.clientHeight;
    if (!avail) return;

    paper.classList.add('measuring');
    const natural = sheet.scrollHeight;
    paper.classList.remove('measuring');

    const pct = Math.round((natural / avail) * 100);
    const state = pct > 100 ? 'over' : pct > 92 ? 'warn' : 'ok';

    // Bail out when nothing moved. The layout effect below runs after every
    // render by design (content can change height without any prop changing),
    // so pushing a fresh object each time would re-render forever.
    const prev = lastFit.current;
    if (prev && prev.pct === pct && prev.state === state) return;
    lastFit.current = { pct, state };
    setFit(lastFit.current);
    onFit?.(lastFit.current);
  }, [onFit]);

  useLayoutEffect(() => {
    fitToPane();
    measure();
  });

  useEffect(() => {
    window.addEventListener('resize', fitToPane);
    document.fonts?.ready.then(() => {
      fitToPane();
      measure();
    });
    return () => window.removeEventListener('resize', fitToPane);
  }, [fitToPane, measure]);

  const meterColor =
    fit?.state === 'over' ? 'var(--color-bad)'
      : fit?.state === 'warn' ? 'var(--color-warn)'
        : 'var(--color-gold-500)';

  const message = !fit
    ? 'Measuring…'
    : fit.state === 'over'
      ? `Over one page by ${fit.pct - 100}% — trim a line or drop the density`
      : fit.state === 'warn'
        ? `Fits — ${fit.pct}% of the page, nearly full`
        : `Fits one page — ${fit.pct}% used`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="no-print flex items-center gap-2 px-4 py-2 text-xs"
        style={{ color: fit?.state === 'over' ? 'var(--color-bad)' : 'var(--color-ink-soft)' }}
      >
        <span
          className="h-1.5 w-[104px] shrink-0 overflow-hidden rounded-full"
          style={{ background: 'var(--color-line)' }}
          role="img"
          aria-label={message}
        >
          <span
            className="block h-full transition-[width,background] duration-200"
            style={{ width: `${Math.min(fit?.pct ?? 0, 100)}%`, background: meterColor }}
          />
        </span>
        <span style={{ fontFamily: 'var(--font-num)' }}>{message}</span>
      </div>

      <div ref={scrollerRef} className="print-root flex flex-1 justify-start overflow-auto p-5">
        <div
          ref={wrapRef}
          className="paper-scale mx-auto origin-top"
          style={{
            transform: `scale(${scale})`,
            width: A4_W * scale,
            height: A4_H * scale,
            flex: 'none',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
