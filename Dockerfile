FROM docker.io/library/alpine:3.23 AS packages
RUN apk upgrade --no-cache \
	&& apk add --no-cache npm
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund --no-update-notifier --omit=dev


FROM docker.io/library/alpine:3.23 AS final
RUN apk upgrade --no-cache \
	&& apk add --no-cache nodejs \
	&& addgroup -S -g 923 runner \
	&& adduser -S -D -u 923 -G runner runner \
	&& rm -f -- /etc/*-

WORKDIR /app
ENV NODE_ENV=production
VOLUME /app/persist

COPY package.json ./
COPY --from=packages /build/node_modules ./node_modules
COPY locales locales
COPY wikidata-items.yaml ./
COPY source ./

USER runner
ENTRYPOINT ["node", "--enable-source-maps"]
CMD ["wikidata-telegram-bot.ts"]
