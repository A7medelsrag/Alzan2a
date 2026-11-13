-- Keep the first three existing promotion banners in dedicated storefront placements.
-- to the new fixed placements. Additional legacy promotions stay in PROMOTION.
WITH ranked_promotions AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "sortOrder", "createdAt", "id") AS position
  FROM "HomepageBanner"
  WHERE "slot" = 'PROMOTION'
)
UPDATE "HomepageBanner" AS banner
SET "slot" = CASE ranked_promotions.position
  WHEN 1 THEN 'SIDE_TOP'::"HomepageBannerSlot"
  WHEN 2 THEN 'SIDE_BOTTOM'::"HomepageBannerSlot"
  WHEN 3 THEN 'TIMER'::"HomepageBannerSlot"
  ELSE 'PROMOTION'::"HomepageBannerSlot"
END
FROM ranked_promotions
WHERE banner."id" = ranked_promotions."id";
