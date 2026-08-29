import { useEffect, useState } from 'react';

/**
 * "Back to top" button for long forms and long registers.
 *
 * The app scrolls in two different ways depending on the breakpoint: below lg
 * the document itself scrolls, at lg and above the form column is its own
 * scroll container. Rather than guess, this listens to both and acts on
 * whichever one is actually scrolled.
 */
export default function ScrollTop({ containerRef, className = '' }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = containerRef?.current;
    const innerScrolls = () => el && el.scrollHeight > el.clientHeight + 4;

    const onScroll = () => {
      const y = innerScrolls() ? el.scrollTop : window.scrollY;
      setShow(y > 320);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    el?.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      el?.removeEventListener('scroll', onScroll);
    };
  }, [containerRef]);

  function toTop() {
    const el = containerRef?.current;
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (el && el.scrollHeight > el.clientHeight + 4) el.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  }

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Scroll back to top"
      title="Back to top"
      className={`no-print fixed z-30 grid h-11 w-11 place-items-center rounded-full text-lg shadow-lg transition-all duration-200 ${
        show ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
      } ${className}`}
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-gold-400)',
        color: 'var(--color-gold-800)',
      }}
    >
      ↑
    </button>
  );
}
