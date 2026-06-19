-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Post" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "formLink" TEXT,
    "formLinkTitle" TEXT,
    "otherLinkTitle" TEXT,
    "otherLink" TEXT,
    "sendNotification" BOOLEAN NOT NULL DEFAULT true,
    "preview" BOOLEAN NOT NULL DEFAULT true,
    "aspectKey" TEXT NOT NULL DEFAULT 'portrait',
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Post_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Post" ("clubId", "createdAt", "description", "formLink", "formLinkTitle", "id", "otherLink", "otherLinkTitle", "preview", "sendNotification", "updatedAt", "uploadedAt") SELECT "clubId", "createdAt", "description", "formLink", "formLinkTitle", "id", "otherLink", "otherLinkTitle", "preview", "sendNotification", "updatedAt", "uploadedAt" FROM "Post";
DROP TABLE "Post";
ALTER TABLE "new_Post" RENAME TO "Post";
CREATE INDEX "Post_clubId_idx" ON "Post"("clubId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
