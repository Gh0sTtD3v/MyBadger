const { contextBridge, ipcRenderer } = require('electron')

const invoke = (ch, ...args) => ipcRenderer.invoke(ch, ...args)

contextBridge.exposeInMainWorld('electron', {
  // Events
  onEvent:         (cb) => ipcRenderer.on('script-event', (_e, p) => cb(p)),
  removeListeners: ()   => ipcRenderer.removeAllListeners('script-event'),

  // Alchemy scan
  runAlchemy:  (apiKey, unisatKey, wallets) => invoke('run-alchemy',  { apiKey, unisatKey, wallets }),
  runContract: (apiKey, contracts)        => invoke('run-contract', { apiKey, contracts }),

  // Raw NFTs
  raw: {
    query:   (filters) => invoke('raw:query',   filters),
    getById: (id)      => invoke('raw:getById', id),
    count:    ()        => invoke('raw:count'),
    distinct: (field)   => invoke('raw:distinct', field),
    clear:   ()        => invoke('raw:clear'),
  },

  // Curations
  curations: {
    list:       ()                     => invoke('curations:list'),
    create:     (name)                 => invoke('curations:create', name),
    delete:     (id)                   => invoke('curations:delete', id),
    get:        (id)                   => invoke('curations:get', id),
    exportJson: (id, name)             => invoke('curations:exportJson', { curationId: id, curationName: name }),
  },

  // Curated NFTs
  curated: {
    nfts:     (curationId, filters) => invoke('curated:nfts',     { curationId, filters }),
    ids:      (curationId)           => invoke('curated:ids',      curationId),
    stats:    (curationId)           => invoke('curated:stats',    curationId),
    distinct: (curationId, field)    => invoke('curated:distinct', { curationId, field }),
    remove:   (curationId, nftIds)   => invoke('curated:remove',  { curationId, nftIds }),
  },

  // Curate
  curate: (curationId, nftIds) => invoke('curate:run', { curationId, nftIds }),

  // Wallpaper
  generateWallpaper: (curationId, curationName) => invoke('wallpaper:generate', { curationId, curationName }),

  // Generate folder (artworks only, no HTML)
  generateFolder: (curationId, curationName) => invoke('folder:generate', { curationId, curationName }),

  // LLM
  llm: {
    status:          ()         => invoke('llm:status'),
    getModelsDir:    ()         => invoke('llm:getModelsDir'),
    setModelsDir:    (dir)      => invoke('llm:setModelsDir', dir),
    download:        ()         => invoke('llm:download'),
    test:            (jsonText) => invoke('llm:test', jsonText),
    onEvent:         (cb)       => ipcRenderer.on('llm-event', (_e, p) => cb(p)),
    removeListeners: ()         => ipcRenderer.removeAllListeners('llm-event'),
  },

  // IPFS
  ipfs: {
    status:       ()      => invoke('ipfs:status'),
    start:        ()      => invoke('ipfs:start'),
    getAutoStart: ()      => invoke('ipfs:getAutoStart'),
    setAutoStart: (val)   => invoke('ipfs:setAutoStart', val),
    pin:    (curationId, nftId, localPath)  => invoke('ipfs:pin', { curationId, nftId, localPath }),
    pinRaw: (nftId, localPath)             => invoke('ipfs:pinRaw', { nftId, localPath }),
    pinUrl: (nftId, url)                    => invoke('ipfs:pinUrl', { nftId, url }),
    unpin:  (nftId, cid)                    => invoke('ipfs:unpin', { nftId, cid }),
    prune:  ()                              => invoke('ipfs:prune'),
  },

  // Pins (persisted across re-scans)
  pins: {
    list: () => invoke('pins:list'),
  },

  // Settings
  settings: {
    getMediaDir: ()          => invoke('settings:getMediaDir'),
    setMediaDir: (newPath)   => invoke('settings:setMediaDir', newPath),
    selectFolder: ()         => invoke('dialog:selectFolder'),
  },
})
