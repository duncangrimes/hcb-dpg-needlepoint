/*
  Warnings:

  - You are about to drop the column `imageId` on the `Canvas` table. All the data in the column will be lost.
  - You are about to drop the `Image` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `meshCount` to the `Canvas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Canvas` table without a default value. This is not possible if the table is not empty.
  - Added the required column `width` to the `Canvas` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Canvas" DROP CONSTRAINT "Canvas_imageId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Image" DROP CONSTRAINT "Image_projectId_fkey";

-- DropIndex
DROP INDEX "public"."Canvas_imageId_key";

-- AlterTable
ALTER TABLE "public"."Canvas" DROP COLUMN "imageId",
ADD COLUMN     "meshCount" INTEGER NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "width" DOUBLE PRECISION NOT NULL;

-- DropTable
DROP TABLE "public"."Image";

-- AddForeignKey
ALTER TABLE "public"."Canvas" ADD CONSTRAINT "Canvas_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
