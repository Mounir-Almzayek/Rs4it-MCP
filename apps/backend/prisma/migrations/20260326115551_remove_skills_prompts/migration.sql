/*
  Warnings:

  - You are about to drop the `RegistryPrompt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RegistrySkill` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RegistryPrompt";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "RegistrySkill";
PRAGMA foreign_keys=on;
