This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Banco de dados (PostgreSQL)

Em dev/test, sem `DATABASE_URL`, a aplicação usa repositórios in-memory. Para usar Postgres:

1. Suba um Postgres:
   ```bash
   docker run --rm -d --name gestro-pg -e POSTGRES_PASSWORD=dev -p 5433:5432 postgres:16-alpine
   ```
2. Exporte a conexão: `export DATABASE_URL=postgres://postgres:dev@localhost:5433/postgres`
3. Aplique as migrações: `npm run db:migrate`
4. Rode a aplicação normalmente (`npm run dev`).

Testes de integração contra um Postgres real (requer Docker, via Testcontainers): `npm run test:db`.
A suíte unit (`npm test`) não usa Docker.

Em **produção**, `DATABASE_URL` é obrigatória — a aplicação falha ao iniciar sem ela (evita cair silenciosamente em persistência in-memory).
