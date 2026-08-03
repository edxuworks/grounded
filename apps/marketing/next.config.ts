import type { NextConfig } from 'next'

// basePath is only needed when hosting under a subpath (e.g. GitHub Pages at
// /grounded). Set BASE_PATH=/grounded for that; leave unset for root-domain
// hosts like Vercel.
const basePath = process.env.BASE_PATH ?? ''

const config: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  trailingSlash: true,
  basePath,
  devIndicators: false,
}

export default config
