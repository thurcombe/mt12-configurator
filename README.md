# MT12 Configurator

A browser-based configuration editor for [EdgeTX](https://edgetx.org/) model profiles on the [Radiomaster MT12](https://www.radiomasterrc.com/products/mt12-surface-radio-controller) surface transmitter.

Replaces painful on-device menu navigation — read and write YAML model files directly to your SD card from the browser.

![Docker Image](https://img.shields.io/docker/v/thurcombe/mt12-configurator?label=docker&logo=docker)

---

## Features

- **Model Management** — create, duplicate, delete and restore models from backup history
- **Mix Editor** — channel-grouped mix lines with drag-to-reorder
- **Expo / Dual Rate** — per-input curves with switch and flight mode conditions
- **Limits** — per-channel min/max/subtrim/invert
- **Logical Switches** — condition builder with function-aware def parsing
- **Special Functions** — switch-triggered function rows
- **Flight Modes** — up to 9 FMs with switch, fade, trim overrides and GVars
- **Module Settings** — surface protocol picker (Traxxas TQi/TQ Gen2, DSM2/DSMX, and more)
- **Radio Settings** — audio, display, switch and pot config with interactive MT12 diagram
- **Kid Mode Wizard** — generates safe-driving constraints (throttle expo, speed limits, steering DR) per vehicle type and speed class
- **Direct SD Card Access** — uses the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) in Chrome/Edge; falls back to zip download in other browsers
- **Backup & Restore** — auto-backup before every save, diff preview, one-click restore

## Browser Support

Requires a browser with the [File System Access API](https://caniuse.com/native-filesystem) for direct SD card writes (Chrome 86+, Edge 86+). Firefox/Safari fall back to a zip download.

---

## Running with Docker

Pull and run the latest image:

```bash
docker run -p 8080:80 thurcombe/mt12-configurator:latest
```

Then open [http://localhost:8080](http://localhost:8080).

### Docker Compose

```bash
docker compose up -d
```

The app will be available at [http://localhost:8080](http://localhost:8080).

---

## Development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build

```bash
npm run build
```

Output goes to `dist/`.

### Tests

```bash
npm test
```

Unit tests cover the codec layer (YAML round-trip, flight mode string preservation, channel offset conversion, protocol parsing, logical switch def encoding).

---

## Deployment

The GitHub Actions workflow in `.github/workflows/docker-publish.yml` builds and pushes to Docker Hub on every push to `main` and on version tags.

### Required Secrets

| Secret | Description |
|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub username (`thurcombe`) |
| `DOCKERHUB_TOKEN` | Docker Hub access token (not your password) |

Create a Docker Hub access token at [hub.docker.com → Account Settings → Security](https://hub.docker.com/settings/security), then add both secrets under **Settings → Secrets and variables → Actions** in the GitHub repo.

### Tagging a release

```bash
git tag v1.0.0
git push origin v1.0.0
```

This produces `thurcombe/mt12-configurator:1.0.0`, `thurcombe/mt12-configurator:1.0`, and `thurcombe/mt12-configurator:latest`.

---

## Tech Stack

| | |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand |
| YAML | js-yaml |
| Drag & Drop | @dnd-kit |
| Compression | fflate (zip fallback) |
| Tests | Vitest |
| Container | nginx:alpine |

---

## Compatibility

Targets **EdgeTX 2.10.0** YAML model format on the Radiomaster MT12. Other EdgeTX transmitters and versions may work but are untested.

---

## License

MIT
