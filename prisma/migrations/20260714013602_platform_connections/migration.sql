-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT 'bottom-left',
    "intervalSeconds" INTEGER NOT NULL DEFAULT 8,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PlatformConnection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "externalId" TEXT,
    "accessToken" TEXT,
    "label" TEXT,
    "address" TEXT,
    "rating" REAL,
    "reviewCount" INTEGER,
    "lastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformConnection_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "connectionId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorPhotoUrl" TEXT,
    "rating" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "relativeTime" TEXT,
    "reviewTime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "PlatformConnection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_token_key" ON "Site"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConnection_siteId_platform_key" ON "PlatformConnection"("siteId", "platform");
