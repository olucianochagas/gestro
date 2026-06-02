import 'server-only'
import { getContainer } from '@/composition/container'
import type { SessionData } from '@/core/identity/domain/ports/session-service'

export async function readApiSession(): Promise<SessionData | null> {
  return getContainer().sessionService.read()
}
