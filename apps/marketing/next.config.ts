import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  output: 'export',      // generates /out folder of pure static HTML/CSS/JS
  trailingSlash: true,   // GitHub Pages needs index.html at each path
  basePath: '/grounded', // repo name — GitHub Pages serves from /grounded/
}

export default config
