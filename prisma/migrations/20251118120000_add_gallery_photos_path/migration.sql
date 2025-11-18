-- Add photosPath to gallery so each record can point to its image directory
ALTER TABLE "gallery"
ADD COLUMN "photosPath" TEXT;
