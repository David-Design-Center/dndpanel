/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GAPI_CLIENT_ID: string
  readonly VITE_GAPI_CLIENT_SECRET: string
  readonly VITE_GAPI_API_KEY: string
  readonly VITE_GAPI_REFRESH_TOKEN: string
  readonly VITE_BACKEND_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
