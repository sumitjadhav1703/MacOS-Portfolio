import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // The desktop is one client tree; nothing here needs image optimisation or rewrites.
  reactStrictMode: true,
  // Next writes AGENTS.md/CLAUDE.md into the repo root by default; this project keeps its
  // own notes in README.md instead.
  agentRules: false,
}

export default nextConfig
