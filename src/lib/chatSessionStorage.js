const PREFIX = 'reflector_chat_active_session_v1_'

export function chatActiveSessionKey(userId) {
  return `${PREFIX}${userId}`
}

export function readActiveChatSessionId(userId) {
  if (!userId) return null
  try {
    return sessionStorage.getItem(chatActiveSessionKey(userId))
  } catch {
    return null
  }
}

export function writeActiveChatSessionId(userId, sessionId) {
  if (!userId || !sessionId) return
  try {
    sessionStorage.setItem(chatActiveSessionKey(userId), sessionId)
  } catch {
    /* private mode / quota */
  }
}

export function clearActiveChatSession(userId) {
  if (!userId) return
  try {
    sessionStorage.removeItem(chatActiveSessionKey(userId))
  } catch {
    /* ignore */
  }
}
