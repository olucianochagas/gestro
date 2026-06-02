import { getContainer } from './container'
import { RegisterUser } from '@/core/identity/application/commands/register-user'
import { AuthenticateUser } from '@/core/identity/application/commands/authenticate-user'
import { GetCurrentUser } from '@/core/identity/application/queries/get-current-user'
import { CreateProject } from '@/core/projects/application/commands/create-project'
import { ListProjects } from '@/core/projects/application/queries/list-projects'
import { GetProject } from '@/core/projects/application/queries/get-project'

export function makeRegisterUser(): RegisterUser {
  const c = getContainer()
  return new RegisterUser(c.users, c.organizations, c.memberships, c.hasher, c.idGenerator, c.clock, c.transactionRunner)
}

export function makeAuthenticateUser(): AuthenticateUser {
  const c = getContainer()
  return new AuthenticateUser(c.users, c.memberships, c.hasher)
}

export function makeGetCurrentUser(): GetCurrentUser {
  return new GetCurrentUser(getContainer().users)
}

export function makeCreateProject(): CreateProject {
  const c = getContainer()
  return new CreateProject(c.projects, c.idGenerator, c.clock)
}

export function makeListProjects(): ListProjects {
  return new ListProjects(getContainer().projects)
}

export function makeGetProject(): GetProject {
  return new GetProject(getContainer().projects)
}
