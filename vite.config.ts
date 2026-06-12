import { defineConfig } from 'vite'

// Static server for the examples (repo root, so ../dist paths resolve).
// PORT env respected so preview harnesses can assign ports.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5618,
    strictPort: false,
  },
})
