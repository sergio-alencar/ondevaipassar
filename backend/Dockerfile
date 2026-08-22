FROM node:24-slim AS build

WORKDIR /app

# backend/frontend manifests only (better layer caching — their install
# layer only invalidates when a package.json actually changes, not on every
# source edit). frontend/package.json is copied too because it's a declared
# npm workspace; without it "npm install" at the root fails to resolve the
# workspace list. frontend's source is never copied in — not needed to run
# the backend. packages/shared needs its FULL source here already, not just
# package.json: the root postinstall runs `tsc` inside it as part of `npm
# install` itself, so tsconfig.json and src/*.ts must already exist by then
# (confirmed by testing — installing with only package.json present makes
# the postinstall's tsc invocation fail with no tsconfig found).
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared packages/shared

RUN npm install

COPY backend backend

FROM node:24-slim

WORKDIR /app/backend

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend /app/backend
COPY --from=build /app/packages/shared /app/packages/shared

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
