-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "productTitle" TEXT NOT NULL,
    "giftTitle" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isIcon" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT,
    "isImage" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "displayOption" TEXT NOT NULL,
    "enableNotes" BOOLEAN NOT NULL DEFAULT false,
    "customCss" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("createdAt", "customCss", "displayOption", "enableNotes", "giftTitle", "icon", "id", "image", "isEnabled", "price", "productTitle", "shop", "updatedAt") SELECT "createdAt", "customCss", "displayOption", "enableNotes", "giftTitle", "icon", "id", "image", "isEnabled", "price", "productTitle", "shop", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE UNIQUE INDEX "Settings_shop_key" ON "Settings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
