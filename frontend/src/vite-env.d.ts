/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

import 'axios';
declare module 'axios' {
  interface AxiosRequestConfig {
    _silent?: boolean;
  }
}