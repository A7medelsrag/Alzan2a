-- Existing completed orders predate dedicated completion timestamps.
-- Their updatedAt value was written with the status change and is the best preserved timestamp.
UPDATE "Order"
SET "deliveredAt" = "updatedAt"
WHERE "status" = 'DELIVERED' AND "deliveredAt" IS NULL;

UPDATE "Order"
SET "returnedAt" = "updatedAt"
WHERE "status" = 'RETURNED' AND "returnedAt" IS NULL;
