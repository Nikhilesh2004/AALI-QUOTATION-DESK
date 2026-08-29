import { forwardRef } from 'react';
import { amountInWords, fmtDate, money, num } from '../lib/format';
import { computeTotals } from '../lib/totals';

const join = (parts, sep = '  ·  ') => parts.filter(Boolean).join(sep);

/**
 * The printed document. Pure presentation: it renders exactly what it is given
 * and computes nothing except the totals (via the shared helper), so what is on
 * screen is what lands on paper and what was written to the database.
 */
const QuotationSheet = forwardRef(function QuotationSheet({ quote, business, density = '1' }, ref) {
  const b = business || {};
  const t = computeTotals(quote);
  const cur = quote.currency;

  const companyMeta = [
    b.address,
    join([b.phone, b.email, b.website]),
    join([b.gstin && `GSTIN ${b.gstin}`, b.pan && `PAN ${b.pan}`]),
  ].filter(Boolean).join('\n');

  const clientMeta = [
    quote.client_contact && `Attn: ${quote.client_contact}`,
    quote.client_address,
    join([quote.client_phone, quote.client_email]),
    quote.client_gstin && `GSTIN ${quote.client_gstin}`,
  ].filter(Boolean).join('\n');

  const taxNotes = [];
  if (quote.tax_mode === 'export') {
    taxNotes.push('Export of service — zero-rated under LUT; no GST charged and no Indian TDS applicable.');
  }
  if (quote.show_tds) {
    taxNotes.push(
      `TDS under Sec 194J @ 2% (${money(t.tds, cur)}) may be deducted by the client; balance payable ${money(t.netAfterTds, cur)}.`,
    );
  }

  return (
    <div className="paper" ref={ref} style={{ '--ds': density }}>
      <div className="sheet">
        {quote.status === 'draft' && <div className="stamp">DRAFT</div>}

        <div className="sheet-mast">
          <div className="who">
            {b.logo_url ? <img className="sheet-logo" src={b.logo_url} alt="" /> : null}
            <div>
              <p className="co-name">{b.name || 'AALI CONSSULTANCY'}</p>
              {b.parent_line ? <p className="co-parent">{b.parent_line}</p> : null}
              {b.tagline ? <p className="co-tag">{b.tagline}</p> : null}
              <div className="co-meta">{companyMeta}</div>
            </div>
          </div>
          <div>
            <p className="doc-title">Quotation</p>
            <dl className="kv">
              <dt>Quote No.</dt>
              <dd>{quote.quote_no || 'On save'}</dd>
              <dt>Date</dt>
              <dd>{fmtDate(quote.quote_date)}</dd>
              <dt>Valid Until</dt>
              <dd>{fmtDate(quote.valid_until)}</dd>
            </dl>
          </div>
        </div>
        <div className="sheet-rule" />

        <div className="parties">
          <div>
            <p className="p-label">Quotation for</p>
            <div className="p-name">{quote.client_name || 'Client name'}</div>
            <div className="p-body">{clientMeta}</div>
          </div>
          <div>
            <p className="p-label">Subject</p>
            <div className="p-name" style={{ fontSize: 'calc(10.6px * var(--ds, 1))' }}>
              {quote.subject || '—'}
            </div>
            <div className="p-body">{quote.prepared_by ? `Prepared by ${quote.prepared_by}` : ''}</div>
          </div>
        </div>

        <table className="lines">
          <colgroup>
            <col style={{ width: '7%' }} />
            <col />
            <col style={{ width: '9%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '18%' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="c">#</th>
              <th>Description</th>
              <th className="c">Qty</th>
              <th className="c">Unit</th>
              <th className="n">Rate</th>
              <th className="n">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(quote.items || []).length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#a2916d', padding: '16px 0' }}>
                  Add a line item to build the quotation.
                </td>
              </tr>
            ) : (
              quote.items.map((it, i) => (
                <tr key={i}>
                  <td className="sl c">{i + 1}</td>
                  <td>
                    <div className="l-desc">{it.desc || '—'}</div>
                    {it.note ? <div className="l-note">{it.note}</div> : null}
                  </td>
                  <td className="c">{num(it.qty) % 1 === 0 ? num(it.qty) : num(it.qty).toFixed(2)}</td>
                  <td className="c">{it.unit}</td>
                  <td className="n">{money(it.rate, cur)}</td>
                  <td className="n">{money(num(it.qty) * num(it.rate), cur)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="sheet-foot">
          <div className="sums">
            <div>
              <p className="p-label">Amount in words</p>
              <div className="words-val">{amountInWords(t.total, cur)}</div>
              {taxNotes.length > 0 && <div className="tax-note">{taxNotes.join(' ')}</div>}
            </div>

            <table className="sum">
              <tbody>
                <tr>
                  <td>Subtotal</td>
                  <td>{money(t.subtotal, cur)}</td>
                </tr>
                {t.discount > 0 && (
                  <>
                    <tr className="dim">
                      <td>
                        Discount
                        {quote.discount_type === 'percent' ? ` (${num(quote.discount_value)}%)` : ''}
                      </td>
                      <td>− {money(t.discount, cur)}</td>
                    </tr>
                    <tr className="sep">
                      <td>Taxable value</td>
                      <td>{money(t.taxable, cur)}</td>
                    </tr>
                  </>
                )}
                {quote.tax_mode === 'intra' && (
                  <>
                    <tr className="dim">
                      <td>CGST @ {t.rate / 2}%</td>
                      <td>{money(t.tax / 2, cur)}</td>
                    </tr>
                    <tr className="dim">
                      <td>SGST @ {t.rate / 2}%</td>
                      <td>{money(t.tax / 2, cur)}</td>
                    </tr>
                  </>
                )}
                {quote.tax_mode === 'inter' && (
                  <tr className="dim">
                    <td>IGST @ {t.rate}%</td>
                    <td>{money(t.tax, cur)}</td>
                  </tr>
                )}
                {quote.tax_mode === 'export' && (
                  <tr className="dim">
                    <td>GST (zero-rated export)</td>
                    <td>{money(0, cur)}</td>
                  </tr>
                )}
                {Math.abs(t.roundDelta) >= 0.005 && (
                  <tr className="dim">
                    <td>Round off</td>
                    <td>
                      {t.roundDelta < 0 ? '− ' : '+ '}
                      {money(Math.abs(t.roundDelta), cur)}
                    </td>
                  </tr>
                )}
                <tr className="grand">
                  <td>Total</td>
                  <td>{money(t.total, cur)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="blocks">
            <div>
              <p className="p-label">Terms &amp; conditions</p>
              <div className="terms-body">{quote.terms}</div>
            </div>
            <div>
              <p className="p-label">Payment details</p>
              <div className="bank-body">{quote.bank}</div>
              <div className="sign">
                <div className="sign-for">For {b.name || 'AALI CONSSULTANCY'}</div>
                <div className="sign-line">
                  {quote.sign_name || 'Authorised Signatory'}
                  <span>{quote.sign_role || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-foot">
            <span>{join([quote.quote_no || 'Quotation', b.name])}</span>
            <span>This is a computer-generated quotation  ·  Page 1 of 1</span>
          </div>
        </div>
      </div>
    </div>
  );
});

export default QuotationSheet;
