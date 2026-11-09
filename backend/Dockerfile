# ---------------------------------------------------------------
#  Image 2 of 3: Backend API (Node.js)
# ---------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# 1. Copy only package files first -> Docker caches the npm install
#    layer, so rebuilds are fast when only source code changes.
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# 2. Copy the application source
COPY src ./src

# 3. Run as the non-root "node" user (security best practice)
USER node

ENV PORT=5000
EXPOSE 5000

CMD ["node", "src/server.js"]
