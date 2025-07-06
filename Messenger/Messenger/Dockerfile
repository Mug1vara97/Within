#See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Messenger.csproj", "./"]
RUN dotnet restore "Messenger.csproj"
COPY . .
RUN dotnet build "Messenger.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "Messenger.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
COPY --from=build /src/. /src/

# Устанавливаем Entity Framework Core tools
RUN dotnet tool install --global dotnet-ef
ENV PATH="${PATH}:/root/.dotnet/tools"

# Создаем директории для загрузок и добавляем применение миграций в entrypoint
RUN echo '#!/bin/bash\n\
mkdir -p /app/Uploads/Avatars /app/Uploads/Banners /app/Uploads/ServerAvatar /app/Uploads/ServerBanner\n\
chown -R 1000:1000 /app/Uploads\n\
chmod -R 755 /app/Uploads\n\
cd /src && dotnet ef database update\n\
cd /app && exec dotnet Messenger.dll' > /app/entrypoint.sh && \
    chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]