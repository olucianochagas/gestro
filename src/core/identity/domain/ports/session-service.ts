export interface SessionData {
  userId: string
  organizationId: string
}

// Porta de TRANSPORTE: consumida pela apresentação (DAL/Server Actions/Route Handlers),
// não pelos casos de uso puros.
export interface SessionService {
  issue(userId: string, organizationId: string): Promise<void>
  read(): Promise<SessionData | null>
  revoke(): Promise<void>
}
