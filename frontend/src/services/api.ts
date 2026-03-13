import axios from 'axios'
import { getUserId } from '../utils/storage'

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
