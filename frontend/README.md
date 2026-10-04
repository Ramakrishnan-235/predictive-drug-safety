This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## API connection and data provenance

Set `NEXT_PUBLIC_API_BASE_URL` to the API base including `/api` (default: `http://127.0.0.1:8000/api`). This public setting is shared by ward reads, admission saves, order authorization, FHIR exports and the server telemetry proxy. Restart/rebuild Next.js after changing it.

Ward rows displayed during loading are explicitly labeled sample records and cannot authorize orders. Admission saves and CPOE authorization require successful API responses. The drawer uses the selected patient's server plans; patients without plans require clinical review. Authorization records an audit event without claiming EHR transmission or changing predicted risk.

The standalone SMR and trajectory screens remain sample demonstrations. Their adjustment previews do not submit orders. Admission estimates and local query responses are labeled demonstrations until a server pipeline result is available for the current inputs. Offline SSE pulses are labeled demo data and cannot establish live synchronization.

## Verification

Run `npm run lint`, `npx tsc --noEmit` and `npm run build`. Run `npm test` for dependency-free API, normalization and SSE lifecycle regressions; the tests require Node.js 22.6 or newer for TypeScript stripping. These checks do not validate a deployed EHR integration or model quality.

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
