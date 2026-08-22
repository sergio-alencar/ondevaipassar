FROM node:24-slim AS build

WORKDIR /app

# better-sqlite3 is a native addon: prebuild-install isn't guaranteed to have
# a binary for whatever exact Node patch version this base image resolves to
# (confirmed by testing — it doesn't, as of this build), so node-gyp falls
# back to compiling from source, which needs these. Build-only stage, so
# they never end up in the final image.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

# Package manifests first (better layer caching — the install layer only
# invalidates when a package.json actually changes, not on every source edit).
# frontend/package.json is copied too because it's a declared npm workspace;
# without it "npm install" at the root fails to resolve the workspace list.
# Its source is never copied in — it's not needed to run the backend.
COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY backend backend
COPY packages/shared packages/shared

FROM node:24-slim

WORKDIR /app/backend

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/backend /app/backend
COPY --from=build /app/packages/shared /app/packages/shared

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "src/index.ts"]
