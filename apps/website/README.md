# BracketBear Website
Making dreams come true since 2023.

## Nuxt
Look at the [Nuxt 3 documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install the dependencies:

```bash
# yarn
yarn install

# npm
npm install

# pnpm
pnpm install
```

## Development Server

Start the development server on `http://localhost:3000`

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```

Locally preview production build:

```bash
npm run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Import Aliases
Here's a quick note on path aliases. We use two in this app:

1. `@`: sends you to the root of the `website` package.
2. `%`: sends you to the `types/generated` directory in the *CMS* directory. We do this so we can incorporate CMS types in our FE app, though this very well might change in the future.
