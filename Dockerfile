# The Ops system, built once and run as a small image.
#
# Three stages, the same shape as the TA System's Dockerfile, so whoever looks
# after one can read the other: install, build, then copy only Next's
# standalone output — the image that runs carries neither the source nor the
# build tools. Nothing here holds a secret; every value comes from the
# environment at run time (deploy/preview/.env.preview.example).

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next salts every server action's id with this key and invents a random one
# per build when it is not set — which renames every button's action on each
# deploy, so a page left open from before it does nothing when clicked. The TA
# System learned that one; a fixed key keeps unchanged actions working.
# It is a salt, not a credential for anything: Docker warns about any ARG with
# a key-shaped name, and Next needs this one at build time. The run-time env
# file carries the same value.
ARG NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
ENV NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
# Which commit this image is, so anyone can tell what the preview is showing.
ARG APP_VERSION=dev
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION
RUN npm run build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3300 HOSTNAME=0.0.0.0
# LibreOffice (Writer only, no GUI) turns a filled Word template into the PDF
# that goes to a client (src/lib/docxToPdf.ts). Carlito and Caladea are metric
# twins of Calibri and Cambria, so an agreement written in those keeps its line
# and page breaks. Installed before the app is copied in, so this layer is the
# same in every release and the server downloads it once.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-writer-nogui fonts-liberation fonts-dejavu-core fonts-crosextra-carlito fonts-crosextra-caladea \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
# No public/ folder yet: there is nothing to serve from one. Add the COPY line
# back when there is.
USER node
EXPOSE 3300
# Next writes its own server.js into the standalone output.
CMD ["node", "server.js"]
