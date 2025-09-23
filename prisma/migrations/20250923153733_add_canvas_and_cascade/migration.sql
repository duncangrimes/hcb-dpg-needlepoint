-- DropForeignKey
ALTER TABLE "public"."Image" DROP CONSTRAINT "Image_projectId_fkey";

-- CreateTable
CREATE TABLE "public"."Canvas" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "originalImage" TEXT NOT NULL,
    "displayImage" TEXT NOT NULL,
    "manufacturerImage" TEXT NOT NULL,

    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Canvas_imageId_key" ON "public"."Canvas"("imageId");

-- AddForeignKey
ALTER TABLE "public"."Image" ADD CONSTRAINT "Image_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Canvas" ADD CONSTRAINT "Canvas_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "public"."Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
