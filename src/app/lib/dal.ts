import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getContainer } from '@/composition/container'
import { makeGetCurrentUser } from '@/composition/factories'
import type { SessionData } from '@/core/identity/domain/ports/session-service'
import type { UserDTO } from '@/core/identity/application/dtos/user.dto'

export const getSession = cache(async (): Promise<SessionData | null> => {
  return getContainer().sessionService.read()
})

export const verifySession = cache(async (): Promise<SessionData> => {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
})

export const getCurrentUser = cache(async (): Promise<UserDTO | null> => {
  const session = await verifySession()
  return makeGetCurrentUser().execute({ userId: session.userId })
})
