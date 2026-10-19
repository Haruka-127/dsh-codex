/**
 * Package-owned invariant companion for `dsh-codex`.
 * @module dsh-codex/invariant
 */

/** Cordis companion plugin name. */
export const name = 'openai-codex-invariant'

/**
 * Retain the legacy companion entry point without the invariant service retired
 * in DSH 0.2.1. This package never registered runtime invariant checks.
 */
export const apply = (): void => {}
