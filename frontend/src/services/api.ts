import axios from 'axios'
import { getUserId } from '../utils/storage'

export interface SessionImage {
  url: string
  description: string
  index: number
}

export interface Session {
  user_id: string
  session_id: string
  mode: string
  style: string
  status: string
  created_at: string
  images: SessionImage[]
  transcript: string | null
}

export async function startSession(
  mode: string,
  style: string,
): Promise<{ session_id: string }> {
  const { data } = await axios.post('/api/session/start', {
    user_id: getUserId(),
    mode,
    style,
  })
  return data
}

export async function listSessions(userId: string): Promise<Session[]> {
  const { data } = await axios.get(`/api/sessions/${userId}`)
  return data.sessions
}

export async function getSession(
  userId: string,
  sessionId: string,
): Promise<Session> {
  const { data } = await axios.get(`/api/session/${userId}/${sessionId}`)
  return data
}
