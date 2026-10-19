import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  detectCompatibility,
  evaluateCompatibility,
  SUPPORTED_DSH_PLUGIN_API_VERSION,
  SUPPORTED_NODE_RANGE,
  SUPPORTED_PI_AI_VERSION,
} from '../src/compatibility.ts'

const compatiblePackages = {
  '@deepseek-ai/dsh-llm': SUPPORTED_DSH_PLUGIN_API_VERSION,
  '@deepseek-ai/dsh-llm-pi-ai': SUPPORTED_DSH_PLUGIN_API_VERSION,
  '@earendil-works/pi-ai': SUPPORTED_PI_AI_VERSION,
} as const

describe('compatibility contract', () => {
  it('keeps the package dependencies aligned with the supported runtime versions', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      dependencies: Record<string, string>
      peerDependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    for (const group of ['dependencies', 'peerDependencies', 'devDependencies'] as const) {
      for (const [name, version] of Object.entries(manifest[group])) {
        if (!name.startsWith('@deepseek-ai/dsh-') && name !== '@earendil-works/pi-ai') continue
        const supported = name === '@earendil-works/pi-ai' ? SUPPORTED_PI_AI_VERSION : SUPPORTED_DSH_PLUGIN_API_VERSION
        expect(version, `${group}.${name}`).toBe(group === 'peerDependencies' ? `^${supported}` : supported)
      }
    }
  })

  it.each([
    ['@deepseek-ai/dsh-llm', '0.2.0-rc.2'],
    ['@deepseek-ai/dsh-llm-pi-ai', '0.2.0-rc.2'],
    ['@earendil-works/pi-ai', '0.87.1'],
  ] as const)('rejects the previous runtime version of %s', (name, version) => {
    const report = evaluateCompatibility({
      nodeVersion: 'v24.0.0',
      packageVersions: { ...compatiblePackages, [name]: version },
    })
    expect(report.status).toBe('incompatible')
    expect(report.packages[name]).toMatchObject({ installed: version, status: 'incompatible' })
  })

  it('evaluates the declared Node, DSH API, and pi-ai versions as compatible', () => {
    const report = evaluateCompatibility({ nodeVersion: 'v22.19.0', packageVersions: compatiblePackages })
    expect(report).toEqual({
      schemaVersion: 1,
      status: 'compatible',
      node: { supported: SUPPORTED_NODE_RANGE, installed: 'v22.19.0', status: 'compatible' },
      packages: {
        '@deepseek-ai/dsh-llm': { supported: SUPPORTED_DSH_PLUGIN_API_VERSION, installed: SUPPORTED_DSH_PLUGIN_API_VERSION, status: 'compatible' },
        '@deepseek-ai/dsh-llm-pi-ai': { supported: SUPPORTED_DSH_PLUGIN_API_VERSION, installed: SUPPORTED_DSH_PLUGIN_API_VERSION, status: 'compatible' },
        '@earendil-works/pi-ai': { supported: SUPPORTED_PI_AI_VERSION, installed: SUPPORTED_PI_AI_VERSION, status: 'compatible' },
      },
    })
  })

  it('marks a known version mismatch incompatible', () => {
    const report = evaluateCompatibility({
      nodeVersion: 'v24.0.0',
      packageVersions: { ...compatiblePackages, '@earendil-works/pi-ai': '0.82.2' },
    })
    expect(report.status).toBe('incompatible')
    expect(report.packages['@earendil-works/pi-ai']).toMatchObject({ installed: '0.82.2', status: 'incompatible' })
  })

  it('keeps missing metadata unknown rather than claiming compatibility', () => {
    const report = evaluateCompatibility({ nodeVersion: 'not-a-node-version', packageVersions: {} })
    expect(report.status).toBe('unknown')
    expect(report.node.status).toBe('unknown')
    expect(report.packages['@deepseek-ai/dsh-llm'].installed).toBeNull()
  })

  it('supports injected package metadata without reading paths or credentials', async () => {
    const report = await detectCompatibility({
      nodeVersion: 'v24.0.1',
      readPackageVersion: async name => compatiblePackages[name],
    })
    expect(report.status).toBe('compatible')
    expect(JSON.stringify(report)).not.toMatch(/node_modules|Users|token|credential/iu)
  })
})
