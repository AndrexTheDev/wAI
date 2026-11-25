/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WAI_ISSUER_KEY?: string;
  readonly VITE_WAI_ISSUER_KEY_FALLBACKS?: string;
  readonly VITE_APK_URL?: string;
  readonly VITE_WEBSITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
