/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public, non-secret flag: set to "true" to switch live weather on by default. Never put API keys here. */
  readonly VITE_DEFAULT_LIVE_WEATHER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
