/**
 * Sleep tool — lets the model wait for a specified duration without
 * holding a shell process. The user can interrupt at any time.
 *
 * Imported by tools.ts:27 when feature('PROACTIVE') || feature('KAIROS').
 */

import React from 'react'
import { z } from 'zod/v4'
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { getKairosActive } from '../../bootstrap/state.js'
import { getInitialSettings } from '../../utils/settings/settings.js'
import { SLEEP_TOOL_NAME, DESCRIPTION, SLEEP_TOOL_PROMPT } from './prompt.js'

const inputSchema = lazySchema(() =>
  z.strictObject({
    duration_ms: z
      .number()
      .int()
      .nonnegative()
      .describe('How long to sleep in milliseconds'),
  }),
)

type Input = z.infer<ReturnType<typeof inputSchema>>

const MAX_TIMEOUT_MS = 2_147_483_647

export const SleepTool = buildTool({
  name: SLEEP_TOOL_NAME,
  maxResultSizeChars: 500,

  async description() {
    return DESCRIPTION
  },

  userFacingName() {
    return 'Sleep'
  },

  get inputSchema() {
    return inputSchema()
  },

  isEnabled() {
    return getKairosActive()
  },

  isConcurrencySafe() {
    return true
  },

  isReadOnly() {
    return true
  },

  toAutoClassifierInput(input: Input) {
    return `sleep ${input.duration_ms}ms`
  },

  async prompt() {
    return SLEEP_TOOL_PROMPT
  },

  async checkPermissions(input: Input) {
    return { behavior: 'allow' as const, updatedInput: input }
  },

  async call(
    args: Input,
    context: { abortController?: AbortController },
  ) {
    let { duration_ms } = args
    const settings = getInitialSettings() as Record<string, unknown>

    // Clamp to configured bounds — max takes precedence over min
    const minSleep = typeof settings.minSleepDurationMs === 'number'
      ? settings.minSleepDurationMs
      : 0
    const maxSleep = typeof settings.maxSleepDurationMs === 'number'
      ? settings.maxSleepDurationMs
      : 5 * 60 * 1000 // 5 minutes default cap

    duration_ms = Math.max(duration_ms, minSleep)
    if (maxSleep >= 0) {
      duration_ms = Math.min(duration_ms, maxSleep)
    }

    const startTime = Date.now()

    const abortController = context.abortController

    await new Promise<void>((resolve) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | undefined

      const finish = () => {
        if (settled) return
        settled = true
        if (timer !== undefined) clearTimeout(timer)
        if (abortController) {
          abortController.signal.removeEventListener('abort', finish)
        }
        resolve()
      }

      if (abortController?.signal.aborted) {
        finish()
        return
      }

      abortController?.signal.addEventListener('abort', finish, { once: true })

      // maxSleepDurationMs = -1 means "wait until interrupted"
      if (maxSleep === -1) return

      timer = setTimeout(finish, Math.min(duration_ms, MAX_TIMEOUT_MS))
    })

    const elapsed = Date.now() - startTime
    const interrupted = maxSleep === -1 || elapsed < duration_ms - 50

    return {
      data: {
        requested_ms: args.duration_ms,
        actual_ms: elapsed,
        interrupted,
      },
    }
  },

  getActivityDescription(input: Partial<Input> | undefined) {
    if (!input?.duration_ms) return 'Sleeping'
    const secs = Math.round((input.duration_ms) / 1000)
    return `Sleeping for ${secs}s`
  },

  getToolUseSummary(input: Partial<Input> | undefined) {
    if (!input?.duration_ms) return null
    return `${Math.round(input.duration_ms / 1000)}s`
  },

  renderToolUseMessage(input: Partial<Input>, _options: { theme: unknown; verbose: boolean }) {
    const secs = input.duration_ms ? Math.round(input.duration_ms / 1000) : '?'
    return React.createElement('div', null, `Sleep: ${secs}s`)
  },

  renderToolResultMessage(
    content: { requested_ms: number; actual_ms: number; interrupted: boolean },
    _progressMessages: unknown[],
    _options: { theme: unknown; verbose: boolean },
  ) {
    if (content.interrupted) {
      return React.createElement('div', null, `Interrupted after ${Math.round(content.actual_ms / 1000)}s`)
    }
    return React.createElement('div', null, `Slept for ${Math.round(content.actual_ms / 1000)}s`)
  },
})
