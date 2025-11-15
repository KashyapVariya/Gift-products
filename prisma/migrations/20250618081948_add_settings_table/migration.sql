-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productTitle" TEXT NOT NULL,
    "giftTitle" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "icon" TEXT,
    "image" TEXT,
    "displayOption" TEXT NOT NULL,
    "enableNotes" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
