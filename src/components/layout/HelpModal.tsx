import { useState } from 'react';
import css from './AboutModal.module.css';
import { UserManualModal } from './UserManualModal.tsx';

interface Props {
  onClose: () => void;
}

export function HelpModal({ onClose }: Props) {
  const [showManual, setShowManual] = useState(false);

  if (showManual) {
    return <UserManualModal onClose={() => setShowManual(false)} />;
  }

  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={css.header}>
          <div>
            <h2 className={css.title}>Help &amp; Resources</h2>
            <p className={css.subtitle}>Documentation and manuals</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18, padding: '2px 8px' }}>✕</button>
        </div>

        <div className={css.body}>
          <section className={css.section}>
            <h3 className={css.sectionTitle}>User Manual</h3>
            <p>The built-in user manual covers all features of this app — model setup, the Basic and Advanced views, KidControl, transmitter settings (input hardware, expansion modules, audio, display), saving &amp; backup, and more.</p>
            <button
              className="btn btn-primary btn-sm"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
              onClick={() => setShowManual(true)}
            >
              Open User Manual
            </button>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>EdgeTX</h3>
            <p>EdgeTX is the open-source firmware running on your MT12. The manual covers the full transmitter menu system, mixer concepts, flight modes, and more.</p>
            <a
              href="https://manual.edgetx.org/"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              EdgeTX documentation ↗
            </a>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>RadioMaster MT12</h3>
            <p>The official RadioMaster MT12 user manual covers hardware controls, module slots, binding, and physical setup.</p>
            <a
              href="https://cdn.shopify.com/s/files/1/0701/8066/7584/files/MT12_A1.4.pdf?v=1770617495"
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              MT12 manual (PDF) ↗
            </a>
          </section>
        </div>

        <div className={css.footer}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
