/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_GAPI_CLIENT_ID: string
  readonly VITE_GAPI_CLIENT_SECRET: string
  readonly VITE_GAPI_API_KEY: string
  readonly VITE_GAPI_REFRESH_TOKEN: string
  readonly VITE_BACKEND_API_URL: string
  readonly VITE_MICROSOFT_CLIENT_ID: string
  readonly VITE_MICROSOFT_AUTHORITY: string
  readonly VITE_MICROSOFT_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
