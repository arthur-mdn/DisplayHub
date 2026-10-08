import {defineConfig, loadEnv} from 'vite'
import react from '@vitejs/plugin-react'

const env = loadEnv(
    'all',
    process.cwd()
);

export default defineConfig({
  plugins: [react()],
  server: {
    port: env.VITE_ADMIN_PORT
  },
})
