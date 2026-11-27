FROM node:24-bookworm-slim
WORKDIR /app
COPY --chown=node:node . .
RUN mkdir -p data && chown node:node data
USER node
ENV HOST=0.0.0.0 PORT=3200 COMMERCE_DB=/app/data/commerce.sqlite
VOLUME ["/app/data"]
EXPOSE 3200
CMD ["node","src/server.js"]
