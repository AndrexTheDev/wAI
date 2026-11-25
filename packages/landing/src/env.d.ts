/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional overrides – defaults come from @wai/shared. */
  readonly VITE_WAI_ISSUER_KEY?: string;
  readonly VITE_APK_URL?: string;
  readonly VITE_APK_SHA256?: string;
  readonly VITE_RELEASES_URL?: string;
  readonly VITE_WEBAPP_URL?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.svg' {
  const src: string;
  export default src;
}
