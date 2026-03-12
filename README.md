# MyBadger

**MyBadger** is an open-source desktop application for indexing, curating, and managing NFT collections across multiple blockchain networks. Built with Electron and Next.js, it runs entirely on your machine — no cloud accounts, no subscriptions, no tracking.

---

## License

MyBadger is free and open-source software released under the [MIT License](LICENSE).

```
MIT License

Copyright (c) 2026 gh0stt_dev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```can

---

## Features

- **Multi-chain NFT indexing** — Scan wallets and smart contracts across 11+ blockchain networks
- **Local media curation** — Download and cache NFT media (images and video) to your hard drive
- **Thumbnail generation** — Automatically creates optimized 400x400 JPEG thumbnails using Sharp
- **IPFS pinning** — Pin curated NFTs to a self-hosted Helia IPFS node running locally
- **Gallery view** — Browse your curated collections in a filterable, searchable grid
- **JSON export** — Export any curation as a structured JSON file for use in other apps
- **Folder export** — Copy all curation artworks flat into a folder of your choice
- **Wallpaper generator** — Generate standalone HTML slideshow projects compatible with [Wallpaper Engine](https://store.steampowered.com/app/431960/Wallpaper_Engine/) (Windows, Steam) or any web browser
- **AI-assisted metadata parsing** — Optionally download a local Phi-3.5 Mini LLM to extract media URLs from complex NFT metadata
- **Embedded database** — All data stored locally in NeDB; no external database required

---

## Supported Networks

| Network | Source |
|---|---|
| Ethereum | Alchemy API |
| Base | Alchemy API |
| Arbitrum | Alchemy API |
| Optimism | Alchemy API |
| ApeChain | Alchemy API |
| BNB Chain | Alchemy API |
| Solana | Magic Eden API |
| Tezos | TzKT API |
| Bitcoin | Public API |
| Counterparty (XCP) | Public API |
| XRP Ledger | Public API |

---

## Requirements

- **Node.js** 18 or later
- **npm** 9 or later
- **Alchemy API key** — required for EVM chain scanning (Ethereum, Base, Arbitrum, Optimism, ApeChain, BNB). Free tier available at [alchemy.com](https://www.alchemy.com).

---

## Installation

```bash
# Clone the repository
git clone https://github.com/gh0stt-dev/indexer.git
cd indexer/app

# Install dependencies
npm install

# Rebuild native modules for Electron
npx electron-rebuild
```

---

## Running in Development

Open two terminals:

```bash
# Terminal 1: Start the Next.js dev server (port 3131)
npm run next:dev

# Terminal 2: Start Electron
npm run electron:dev
```

Or run both at once:

```bash
npm run dev
```

---

## Building for Production

```bash
# Build the Next.js frontend as a static export
ELECTRON_BUILD=1 npm run build

# Launch the packaged app
npm start
```

The static output goes to the `out/` directory. Electron loads `out/index.html` in production mode.

---

## First-Time Setup

1. **Open the Config page** (gear icon in the sidebar)
   - Enter your Alchemy API key
   - Optionally choose a custom folder for downloaded media
   - Optionally download the local LLM model (~2 GB, Phi-3.5 Mini quantized)

2. **Add wallets** on the Wallets page
   - Paste a wallet address and check the chains you want to scan
   - Click **Scan Wallets** — NFTs will be indexed into the local database

3. **Add contracts** on the Contracts page (optional)
   - Enter a smart contract address and select the chain
   - Click **Scan** to index all NFTs from that contract

---

## Curation Workflow

1. Go to the **Indexer** page
2. Create a new curation or select an existing one
3. Browse the raw NFT index — filter by chain, wallet, or search by name
4. Select NFTs individually or in bulk
5. Click **Curate** — media is downloaded and thumbnails are generated locally
6. Open the **Gallery** to view your curated collection
7. Export as **JSON**, copy artworks with **Generate Folder**, or generate a **Wallpaper** HTML slideshow project

---

## IPFS Pinning

MyBadger runs a local [Helia](https://github.com/ipfs/helia) IPFS node. On the **IPFS page** you can:

- View the status of your local node (peer count, peer ID)
- Filter curated NFTs by their media source (IPFS, Arweave, HTTP)
- Pin or unpin individual or batches of NFTs
- Track which NFTs have been assigned a CID

No third-party pinning service is used — everything stays on your machine.

---

## Project Structure

```
app/
├── electron/
│   ├── main.js          # Electron main process — BrowserWindow, IPC handlers, custom protocol
│   ├── preload.js       # Context-isolated bridge between main process and renderer
│   └── lib/
│       ├── db.js        # NeDB database layer (nfts, curations, curated-nfts)
│       ├── alchemy.js   # EVM chain scanning via Alchemy API
│       ├── solana.js    # Solana scanning via Magic Eden API
│       ├── tezos.js     # Tezos scanning via TzKT API
│       ├── btc.js       # Bitcoin address scanning
│       ├── xcp.js       # Counterparty asset scanning
│       ├── xrpl.js      # XRP Ledger NFT scanning
│       ├── curate.js    # Curation engine — media download, thumbnail generation
│       ├── ipfs.js      # Helia IPFS node — pin/unpin operations
│       ├── llm.js       # Local Phi-3.5 Mini LLM — metadata URL extraction
│       └── wallpaper.js # Wallpaper project generator
├── src/
│   ├── app/
│   │   ├── indexer/     # Main indexing and curation page
│   │   ├── gallery/     # Gallery grid view per curation
│   │   ├── wallets/     # Wallet configuration and scanning
│   │   ├── contracts/   # Contract scanning
│   │   ├── ipfs/        # IPFS management
│   │   ├── config/      # App settings
│   │   └── info/        # About page
│   ├── components/
│   │   └── NavBar.jsx   # Collapsible sidebar navigation
│   └── context/
│       ├── ConfigContext.jsx     # API key and wallet list state
│       └── CurationsContext.jsx  # Curations list state
├── public/              # Static assets (logo, favicon)
├── resources/           # Electron build resources (icons)
├── next.config.js       # Next.js config (dev server + static export)
└── package.json
```

---

## Data Storage

All data is stored locally on your machine:

| Data | Location |
|---|---|
| NFT index database | `{userData}/nfts.db` |
| Curations database | `{userData}/curations.db` |
| Curated NFTs database | `{userData}/curated-nfts.db` |
| App settings | `{userData}/settings.json` |
| Downloaded media | Configurable (default: `{userData}/media/`) |
| IPFS node storage | `{userData}/ipfs/` |
| LLM model | `{userData}/models/` |

`{userData}` is the Electron app data directory:
- **Windows:** `%APPDATA%\indexer-app`
- **macOS:** `~/Library/Application Support/indexer-app`
- **Linux:** `~/.config/indexer-app`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| Frontend framework | Next.js 15 + React 18 |
| Database | NeDB (embedded, no server) |
| Image processing | Sharp |
| IPFS | Helia + UnixFS |
| Local AI | node-llama-cpp (Phi-3.5 Mini) |
| HTTP client | Axios |
| Styling | CSS Modules + globals |

---

## Architecture Overview

```
User Action
    │
    ▼
React (Next.js renderer)
    │  IPC via preload bridge
    ▼
Electron Main Process
    ├── NeDB          — read/write local NFT data
    ├── Alchemy/APIs  — fetch NFTs from blockchains
    ├── curate.js     — download media, generate thumbnails
    ├── ipfs.js       — pin/unpin via local Helia node
    └── llm.js        — extract URLs from metadata with Phi-3.5
    │
    ▼
nftmedia:// protocol → serve local files back to renderer
```

Security: Node integration is disabled in the renderer. All Node.js access goes through the context-isolated preload script via IPC.

---

## Pages

### Indexer
The main workspace. Create and select curations, browse all indexed NFTs with pagination and filtering (by chain, wallet, search term), select items in bulk, and kick off the curation process.

### Gallery
Visual grid display of a single curation. Each card shows the thumbnail, name, collection, chain, and source badge (IPFS / Arweave / HTTP). Click any card to open a detail modal with full media view, metadata, and token info. Three export options are available from the toolbar: **Generate JSON** (structured metadata file), **Generate Folder** (copies all artwork files flat into a chosen directory), and **Generate Wallpaper** (creates a self-contained HTML slideshow project compatible with [Wallpaper Engine](https://store.steampowered.com/app/431960/Wallpaper_Engine/) on Windows via Steam, or openable directly in any web browser).

### Wallets
Add wallet addresses with per-chain checkboxes. Supports all 11 networks simultaneously. Hit Scan to populate the NFT index.

### Contracts
Scan a specific EVM smart contract by address + chain. Useful for indexing full collections rather than wallet-owned subsets.

### IPFS
Manage pinning for your curated media. Filter by source type or pin status. Batch pin/unpin with live log output. Shows local node status including peer count.

### Config
- Alchemy API key
- Media folder path
- LLM model download status and trigger
- IPFS node diagnostics (peer ID, peer count)

---

## Contributing

Contributions are welcome. To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes and test locally with `npm run dev`
4. Submit a pull request

Please open an issue first for large changes or new chain integrations.

---

## Known Limitations

- An Alchemy API key is required for EVM chains (free tier is sufficient for personal use)
- The LLM model download is ~2 GB and optional — only needed for complex metadata parsing
- IPFS pins are content-addressed; anyone with your CID can retrieve the content
- The Alchemy API key is stored in localStorage; avoid using MyBadger on shared machines

---

## Author

Built by **gh0stt_dev**.
