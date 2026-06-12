import { defineConfig } from 'tsup'

export default defineConfig([
  // ESM build for bundler users: tone stays external (their package manager provides it).
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['tone'],
    platform: 'browser',
    outDir: 'dist',
    target: 'es2021',
  },
  // IIFE build for the one-script-tag promise: Tone bundled, global `Sonarium`.
  {
    entry: { 'sonarium.iife': 'src/index.ts' },
    format: ['iife'],
    globalName: 'Sonarium',
    minify: true,
    sourcemap: true,
    noExternal: ['tone'],
    platform: 'browser',
    outDir: 'dist',
    target: 'es2021',
    outExtension: () => ({ js: '.js' }),
  },
])
