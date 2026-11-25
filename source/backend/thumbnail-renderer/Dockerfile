FROM mcr.microsoft.com/playwright:v1.52.0-noble
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server.mjs ./
USER pwuser
EXPOSE 3001
CMD ["node","server.mjs"]
