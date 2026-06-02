import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { SessionData, SessionService } from '@/core/identity/domain/ports/session-service'

const COOKIE_NAME = 'gestro_session'

export class JoseSessionService implements SessionService {
  constructor(
    private readonly secret: Uint8Array,
    private readonly maxAgeSeconds: number = 60 * 60 * 24 * 7,
  ) {}

  async issue(userId: string, organizationId: string): Promise<void> {
    const token = await new SignJWT({ userId, organizationId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${this.maxAgeSeconds}s`)
      .sign(this.secret)

    const store = await cookies()
    store.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: this.maxAgeSeconds,
    })
  }

  async read(): Promise<SessionData | null> {
    const store = await cookies()
    const token = store.get(COOKIE_NAME)?.value
    if (!token) return null
    try {
      const { payload } = await jwtVerify(token, this.secret, { algorithms: ['HS256'] })
      const userId = payload.userId
      const organizationId = payload.organizationId
      if (typeof userId !== 'string' || typeof organizationId !== 'string') return null
      return { userId, organizationId }
    } catch {
      return null
    }
  }

  async revoke(): Promise<void> {
    const store = await cookies()
    store.delete(COOKIE_NAME)
  }
}
