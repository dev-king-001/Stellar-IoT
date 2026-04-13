# Stellar IoT Frontend

Next.js frontend for the Stellar IoT platform.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- TailwindCSS
- React

## Running

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`

## Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
├── services/         # API service layer
└── types/           # TypeScript types
```

## Components

- `Navbar` - Navigation bar with wallet connection
- `DeviceCard` - Display device information
- `PayButton` - Handle payment flow

## Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CONTRACT_ID=your_contract_id
```

## Development

The app uses the App Router. Add new pages in `src/app/` and components in `src/components/`.
