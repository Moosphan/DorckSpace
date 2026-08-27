export const CHATGPT_SESSION_PARTITION = 'persist:chatgpt-session'

interface SessionCookie {
  name: string
  value: string
}

export type ChatGPTSessionStatus = 'connected' | 'signed_out'

const SESSION_COOKIE_NAMES = new Set([
  '__Secure-next-auth.session-token',
  '__Host-next-auth.session-token',
  'next-auth.session-token',
])

export function hasChatGPTSessionCookie(cookies: SessionCookie[]): boolean {
  return cookies.some((cookie) => {
    const baseName = cookie.name.replace(/\.\d+$/, '')
    return SESSION_COOKIE_NAMES.has(baseName) && cookie.value.length > 0
  })
}

export async function waitForChatGPTSession(
  readCookies: () => Promise<SessionCookie[]>,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<ChatGPTSessionStatus> {
  const attempts = Math.max(1, options.attempts ?? 1)
  const delayMs = Math.max(0, options.delayMs ?? 0)

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (hasChatGPTSessionCookie(await readCookies())) return 'connected'
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return 'signed_out'
}
