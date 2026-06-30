/// <reference types="vite/client" />

declare module '*.json' {
  const value: unknown
  export default value
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
