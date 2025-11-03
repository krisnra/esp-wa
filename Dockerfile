# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /app

# (opsional) update npm ? lebih stabil
RUN npm i -g npm@11

# salin lockfile biar cache efektif
COPY package*.json ./
COPY client/package*.json ./client/

# set registry & retry supaya tahan jaringan flakey
ARG NPM_REGISTRY=https://registry.npmjs.org/
RUN npm config set registry $NPM_REGISTRY \
 && npm config set fetch-retries 5 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 120000

# install deps root & client (tanpa audit/fund biar cepat)
RUN npm ci --no-audit --no-fund
RUN npm ci --prefix client --no-audit --no-fund

# lanjut build
COPY . .
RUN npm run build:client
RUN npm run build
