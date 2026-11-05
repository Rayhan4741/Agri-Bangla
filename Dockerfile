# ── build stage: client + server ─────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
# the MongoDB test helper must not download a database binary during image builds
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY client/package.json client/package-lock.json client/
RUN npm --prefix client ci
COPY server/package.json server/package-lock.json server/
RUN npm --prefix server ci
COPY client client
COPY server server
RUN npm --prefix client run build && npm --prefix server run build && npm --prefix server prune --omit=dev

# ── runtime stage ───────────────────────────────────────────────────────────
FROM node:22-alpine
ENV NODE_ENV=production PORT=5000
WORKDIR /app
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/node_modules server/node_modules
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/client/dist client/dist
# seed script reads the content JSON from here
COPY --from=build /app/client/src/data client/src/data
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "server/dist/index.js"]
