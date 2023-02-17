FROM node:18-alpine AS base

FROM base AS builder

WORKDIR /src
COPY . /src
RUN npm install && npm run build

FROM base

WORKDIR /srv
COPY --from=builder /src/src/index.mjs /srv/src/
COPY --from=builder /src/package.json /src/package-lock.json /srv/

ENTRYPOINT [ "npm", "run", "start" ]
