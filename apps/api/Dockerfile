FROM node:20-alpine AS build
WORKDIR /app
COPY apps/api/package.json ./
COPY packages/database/prisma ./prisma
RUN npm install
RUN npx prisma generate --schema ./prisma/schema.prisma
COPY apps/api ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY apps/api/package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/prisma ./prisma
EXPOSE 4000
CMD ["node", "dist/main.js"]
