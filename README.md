# Bracket Bear Website

## Introduction to the package
This is a monorepo for the website.
The app is essentially a Nuxt front-end with a Strapi CMS.

## Requirements
This app requires Node.js and npm.

## Installation
To install, run the following command:
```bash
npm install
```

## To develop
To develop, run the following command:
```bash
npm run dev
```
This will run the front-end and the back-end at the same time and output all messages in one terminal window. If this doesn't work for you, it's also possible to run the individual apps by running their dev commands.

## To generate the front-end
We use Nuxt to generate our front-end. To do so, however, the CMS has to be running in the background. The following command will start the CMS, then generate the website, and then kill the CMS on completion. The output will be placed in `./packages/website/.output`.

## Typescript
This project uses Typescript for type safety. It's still a work in progress, so the way we use it might change in the future.