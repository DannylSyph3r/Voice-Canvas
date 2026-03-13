import { v4 as uuidv4 } from 'uuid'

const USER_ID_KEY = 'vc_user_id'
const SESSION_IDS_KEY = 'vc_session_ids'

export function getUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export function addSessionId(id: string): void {
  const ids = getSessionIds()
  ids.unshift(id)
  localStorage.setItem(SESSION_IDS_KEY, JSON.stringify(ids))
}

export function getSessionIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SESSION_IDS_KEY) ?? '[]')
  } catch {
    return []
  }
}
