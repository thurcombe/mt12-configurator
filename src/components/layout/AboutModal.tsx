import css from './AboutModal.module.css';

interface Props {
  onClose: () => void;
}

export function AboutModal({ onClose }: Props) {
  return (
    <div className={css.overlay} onClick={onClose}>
      <div className={css.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={css.header}>
          <div>
            <h2 className={css.title}>EdgeTX MT12 Config Editor</h2>
            <p className={css.subtitle}>A browser-based model configuration tool for the RadioMaster MT12</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: 18, padding: '2px 8px' }}>✕</button>
        </div>

        <div className={css.body}>
          <section className={css.section}>
            <h3 className={css.sectionTitle}>What this app does</h3>
            <p>This editor reads and writes EdgeTX model files directly from your MT12's SD card using the browser File System Access API. It provides a simplified interface for common surface vehicle tasks:</p>
            <ul className={css.list}>
              <li>Guided setup wizard for throttle, steering, gyro gain, radio link protocol, failsafe, and speed limiter</li>
              <li>KidControl — a safe driving mode with reduced throttle, steering limits, and ramp rates, activated by a switch</li>
              <li>Steering trim and gyro gain cards in the basic view for quick in-session adjustment</li>
              <li>Vehicle type management with per-type KidControl presets and custom images</li>
              <li>Model photos, scale, and vehicle type metadata stored alongside your models on the SD card</li>
              <li>Visual MT12 diagram with live input highlighting during configuration</li>
              <li>Full round-trip fidelity — only the fields this editor manages are changed; everything else is preserved exactly</li>
            </ul>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>Model management</h3>
            <ul className={css.list}>
              <li>Import and export individual models as EdgeTX YAML files</li>
              <li>Duplicate a model with a new name</li>
              <li>Delete a model with an option to also remove its backups</li>
              <li>Automatic timestamped backups on every save, with configurable retention count (default 15)</li>
              <li>Per-model and all-models backup history with YAML diff view, restore to any saved point, and batch delete</li>
            </ul>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>Demo mode</h3>
            <p>
              Append <code>?demo</code> to the URL to load a virtual in-memory SD card with sample models. Changes are not persisted to disk — use the <strong>Download SD card</strong> button to export the result as a ZIP file.
            </p>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>MT12 expansion module (optional joystick / buttons)</h3>
            <p>
              The MT12 can be fitted with an optional expansion module that adds a thumbstick (joystick) and/or additional push-buttons to the top of the transmitter. In EdgeTX these appear as additional analog inputs (typically <strong>J1x / J1y</strong> for the joystick axes) and digital switch inputs.
            </p>
            <p>
              <strong>Current support:</strong> Models that use joystick or button inputs will load, save, and round-trip correctly — no data is lost. However, the <em>Basic view</em> setup wizard only handles the standard MT12 controls (trigger and steering wheel). To assign or mix joystick/button inputs you need to use the <strong>Advanced view</strong>, which gives direct access to all mix and expo lines.
            </p>
            <p>
              The diagram view does not currently highlight the expansion module inputs on hover.
            </p>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>Other known limitations</h3>
            <ul className={css.list}>
              <li><strong>Single drive mode:</strong> The wizard configures drive mode 0 only. KidControl uses drive mode 1 as its safe-mode slot. Multi-mode setups (more than two modes) are not supported in the basic view — use Advanced view.</li>
              <li><strong>No curve editor:</strong> Expo values can be read and written via the Advanced view, but there is no graphical curve editor.</li>
              <li><strong>No telemetry configuration:</strong> Telemetry sensor setup, alarms, and logging are not accessible — use the transmitter menu or OpenTX Companion.</li>
              <li><strong>No trainer / buddy-box:</strong> Trainer port and buddy-box configuration is not supported.</li>
              <li><strong>Single internal module:</strong> Only the primary RF module (slot 0) is managed by the wizard. External module configuration (slot 1) requires Advanced view.</li>
              <li><strong>Metadata is SD-card-local:</strong> Photos, scale, and vehicle type are stored in <code>.webconfig/</code> on the SD card. They do not travel with the <code>.yml</code> file if you copy a model to another card or into OpenTX Companion.</li>
            </ul>
          </section>

          <section className={css.section}>
            <h3 className={css.sectionTitle}>Planned / roadmap</h3>
            <ul className={css.list}>
              <li>Expansion module input labelling and diagram highlight for joystick and button inputs</li>
              <li>Graphical expo / curve editor</li>
              <li>Multi-drive-mode management beyond KidControl</li>
            </ul>
          </section>
        </div>

        <div className={css.footer}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
