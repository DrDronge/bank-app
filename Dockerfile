# syntax=docker/dockerfile:1

# Stage 1: Build React frontend
FROM node:22-alpine AS frontend
WORKDIR /app
COPY bank.Web/package*.json ./
RUN npm ci
COPY bank.Web/ ./
# Build into /app/dist
RUN npx vite build --outDir /app/dist --emptyOutDir

# Stage 2: Build .NET API
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build

COPY . /source
WORKDIR /source/bank.Api

ARG TARGETARCH

RUN --mount=type=cache,id=nuget,target=/root/.nuget/packages \
    dotnet publish -a ${TARGETARCH/amd64/x64} --use-current-runtime --self-contained false -o /app

# Stage 3: Final runtime image
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final
WORKDIR /app

COPY --from=build /app .
# Copy the React build into wwwroot so ASP.NET serves it as static files
COPY --from=frontend /app/dist ./wwwroot

USER $APP_UID

ENTRYPOINT ["dotnet", "bank.Api.dll"]
