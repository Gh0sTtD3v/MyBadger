const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  output: process.env.ELECTRON_BUILD ? 'export' : undefined,
}

module.exports = nextConfig
