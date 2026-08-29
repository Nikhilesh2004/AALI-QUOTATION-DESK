import { useEffect, useRef, useState } from 'react';

const MIN = 5;

/**
 * Asks why a quotation is being deleted, and will not submit without an answer.
 *
 * The rule is not enforced here -- delete_quotation() in the database refuses a
 * reason shorter than 5 characters, whoever is calling and however. This dialog
 * exists so a person meets that rule with a sentence rather than an error.
 */
export default function DeleteDialog({ quote, onCancel, onConfirm }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, busy]);

  const tooShort = reason.trim().length < MIN;

  async function submit(e) {
    e.preventDefault();
    if (tooShort || busy) return;
    setBusy(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err) {
      setError(err.message || String(err));
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-10"
      style={{ background: 'rgba(51, 40, 15, 0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <form
        onSubmit={submit}
        className="card w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="del-title"
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--color-line)' }}>
          <h2 id="del-title" className="text-[17px] font-bold" style={{ fontFamily: 'var(--font-doc)' }}>
            Delete {quote?.quote_no}
          </h2>
          <p className="mt-1 text-[12.5px]" style={{ color: 'var(--color-ink-soft)' }}>
            {quote?.client_name || 'This quotation'} — {quote?.subject || 'no subject'}
          </p>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <p className="text-[13px]" style={{ color: 'var(--color-ink-soft)' }}>
            The quotation leaves your register and its number stays used — it is never re-issued.
            A super admin can still see it, along with your reason.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="lbl">Why are you deleting it?</span>
            <textarea
              ref={inputRef}
              className="fld"
              rows={3}
              value={reason}
              disabled={busy}
              placeholder="e.g. Client cancelled the project before acceptance"
              onChange={(e) => setReason(e.target.value)}
            />
            <span className="text-[11px]" style={{ color: tooShort ? 'var(--color-warn)' : 'var(--color-ink-soft)' }}>
              {tooShort
                ? `At least ${MIN} characters — this is kept on the record.`
                : 'This is stored with the quotation.'}
            </span>
          </label>

          {error && (
            <p className="rounded-lg px-3 py-2 text-[12.5px]"
              style={{ background: '#fbeceb', color: '#8f2a2a', border: '1px solid #f0cfcd' }}>
              {error}
            </p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <button type="button" className="btn" onClick={onCancel} disabled={busy}>
              Keep it
            </button>
            <button type="submit" className="btn btn-danger" disabled={tooShort || busy}>
              {busy ? 'Deleting…' : 'Delete quotation'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
