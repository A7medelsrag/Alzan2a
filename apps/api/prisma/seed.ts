import { HomepageSectionType, PrismaClient, ProductStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database with multi-category catalog...");

  // Categories
  const catWomen = await prisma.category.upsert({
    where: { slug: "women-clothing" },
    update: { name: "ملابس نسائية" },
    create: {
      name: "ملابس نسائية",
      slug: "women-clothing",
    },
  });

  const catShoesBags = await prisma.category.upsert({
    where: { slug: "shoes-bags" },
    update: { name: "أحذية وحقائب" },
    create: {
      name: "أحذية وحقائب",
      slug: "shoes-bags",
    },
  });

  const catHome = await prisma.category.upsert({
    where: { slug: "home-essentials" },
    update: { name: "أدوات منزلية" },
    create: {
      name: "أدوات منزلية",
      slug: "home-essentials",
    },
  });

  const catBeauty = await prisma.category.upsert({
    where: { slug: "beauty-care" },
    update: { name: "عناية وجمال" },
    create: {
      name: "عناية وجمال",
      slug: "beauty-care",
    },
  });

  const catAccessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: { name: "إكسسوارات" },
    create: {
      name: "إكسسوارات",
      slug: "accessories",
    },
  });

  // Category 1 Products (Women's Clothing)
  const prodHoodie = await prisma.product.upsert({
    where: { slug: "cotton-oversized-hoodie" },
    update: {
      name: "هودي أوفر سايز قطن مصري",
      description: "هودي خريفي وشتوي فاخر من القطن المصري الخالص 100% مريح وعملي لجميع الإطلالات اليومية.",
      categoryId: catWomen.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "هودي أوفر سايز قطن مصري",
      slug: "cotton-oversized-hoodie",
      description: "هودي خريفي وشتوي فاخر من القطن المصري الخالص 100% مريح وعملي لجميع الإطلالات اليومية.",
      categoryId: catWomen.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "HOODIE-BURGUNDY-M" },
    update: { name: "نبيتي / M", priceCents: 45000, stockQuantity: 25, productId: prodHoodie.id },
    create: { sku: "HOODIE-BURGUNDY-M", name: "نبيتي / M", priceCents: 45000, stockQuantity: 25, productId: prodHoodie.id },
  });

  await prisma.productVariant.upsert({
    where: { sku: "HOODIE-NAVY-L" },
    update: { name: "كحلي / L", priceCents: 45000, stockQuantity: 15, productId: prodHoodie.id },
    create: { sku: "HOODIE-NAVY-L", name: "كحلي / L", priceCents: 45000, stockQuantity: 15, productId: prodHoodie.id },
  });

  const prodDress = await prisma.product.upsert({
    where: { slug: "satin-midi-dress" },
    update: {
      name: "فستان ستان ميدي سواريه",
      description: "فستان ستان ناعم بتصميم راقٍ ومحتشم مع حزام خصر متناسق مناسب للمناسبات والسهرات.",
      categoryId: catWomen.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "فستان ستان ميدي سواريه",
      slug: "satin-midi-dress",
      description: "فستان ستان ناعم بتصميم راقٍ ومحتشم مع حزام خصر متناسق مناسب للمناسبات والسهرات.",
      categoryId: catWomen.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "DRESS-BLACK-M" },
    update: { name: "أسود / M", priceCents: 68000, stockQuantity: 18, productId: prodDress.id },
    create: { sku: "DRESS-BLACK-M", name: "أسود / M", priceCents: 68000, stockQuantity: 18, productId: prodDress.id },
  });

  await prisma.productVariant.upsert({
    where: { sku: "DRESS-OLIVE-L" },
    update: { name: "زيتي / L", priceCents: 68000, stockQuantity: 12, productId: prodDress.id },
    create: { sku: "DRESS-OLIVE-L", name: "زيتي / L", priceCents: 68000, stockQuantity: 12, productId: prodDress.id },
  });

  // Category 2 Products (Shoes & Bags)
  const prodPumps = await prisma.product.upsert({
    where: { slug: "classic-heeled-pumps" },
    update: {
      name: "حذاء كعب عالي كلاسيك",
      description: "حذاء نسائي أنيق ومريح بنعل طبي مبطن وكعب متوسط الارتفاع مناسب للعمل والمناسبات الرسمية.",
      categoryId: catShoesBags.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "حذاء كعب عالي كلاسيك",
      slug: "classic-heeled-pumps",
      description: "حذاء نسائي أنيق ومريح بنعل طبي مبطن وكعب متوسط الارتفاع مناسب للعمل والمناسبات الرسمية.",
      categoryId: catShoesBags.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "SHOE-BLACK-38" },
    update: { name: "أسود / مقاس 38", priceCents: 52000, stockQuantity: 20, productId: prodPumps.id },
    create: { sku: "SHOE-BLACK-38", name: "أسود / مقاس 38", priceCents: 52000, stockQuantity: 20, productId: prodPumps.id },
  });

  await prisma.productVariant.upsert({
    where: { sku: "SHOE-BEIGE-39" },
    update: { name: "بيج / مقاس 39", priceCents: 52000, stockQuantity: 15, productId: prodPumps.id },
    create: { sku: "SHOE-BEIGE-39", name: "بيج / مقاس 39", priceCents: 52000, stockQuantity: 15, productId: prodPumps.id },
  });

  const prodBag = await prisma.product.upsert({
    where: { slug: "leather-shoulder-bag" },
    update: {
      name: "حقيبة كتف جلد فاخرة",
      description: "شنطة يد وكتف عملية مع جيوب داخلية متعددة وسحّاب معدني متين مقاوم للصدأ.",
      categoryId: catShoesBags.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "حقيبة كتف جلد فاخرة",
      slug: "leather-shoulder-bag",
      description: "شنطة يد وكتف عملية مع جيوب داخلية متعددة وسحّاب معدني متين مقاوم للصدأ.",
      categoryId: catShoesBags.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "BAG-BROWN" },
    update: { name: "بني كلاسيكي", priceCents: 75000, stockQuantity: 14, productId: prodBag.id },
    create: { sku: "BAG-BROWN", name: "بني كلاسيكي", priceCents: 75000, stockQuantity: 14, productId: prodBag.id },
  });

  // Category 3 Products (Home Essentials)
  const prodSpiceRack = await prisma.product.upsert({
    where: { slug: "rotating-spice-rack-12pcs" },
    update: {
      name: "طقم توابل دوار 12 برطمان زجاجي",
      description: "حامل توابل استانلس ستيل دوار 360 درجة مع 12 برطمان زجاجي محكم الغلق لحفظ النكهات.",
      categoryId: catHome.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "طقم توابل دوار 12 برطمان زجاجي",
      slug: "rotating-spice-rack-12pcs",
      description: "حامل توابل استانلس ستيل دوار 360 درجة مع 12 برطمان زجاجي محكم الغلق لحفظ النكهات.",
      categoryId: catHome.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "HOME-SPICE-12" },
    update: { name: "فضي استانلس", priceCents: 39000, stockQuantity: 30, productId: prodSpiceRack.id },
    create: { sku: "HOME-SPICE-12", name: "فضي استانلس", priceCents: 39000, stockQuantity: 30, productId: prodSpiceRack.id },
  });

  const prodBedspread = await prisma.product.upsert({
    where: { slug: "embroidered-bedspread-set" },
    update: {
      name: "مفرش سرير مطرز فاخر 6 قطع",
      description: "طقم مفرش سرير فندقي مطرز بنقوش كلاسيكية هادئة وخامة قطن قطيفة ناعمة.",
      categoryId: catHome.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "مفرش سرير مطرز فاخر 6 قطع",
      slug: "embroidered-bedspread-set",
      description: "طقم مفرش سرير فندقي مطرز بنقوش كلاسيكية هادئة وخامة قطن قطيفة ناعمة.",
      categoryId: catHome.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "HOME-BED-BEIGE" },
    update: { name: "بيج شامبين - كينج", priceCents: 89000, stockQuantity: 12, productId: prodBedspread.id },
    create: { sku: "HOME-BED-BEIGE", name: "بيج شامبين - كينج", priceCents: 89000, stockQuantity: 12, productId: prodBedspread.id },
  });

  // Category 4 Products (Beauty & Care)
  const prodSkincare = await prisma.product.upsert({
    where: { slug: "natural-skincare-bundle" },
    update: {
      name: "مجموعة العناية بالبشرة الطبيعية 3 في 1",
      description: "سيروم فيتامين C، غسول رغوي لطيف، ومرطب هايلورونيك أسيد لبشرة نضرة ومشرقة طوال اليوم.",
      categoryId: catBeauty.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "مجموعة العناية بالبشرة الطبيعية 3 في 1",
      slug: "natural-skincare-bundle",
      description: "سيروم فيتامين C، غسول رغوي لطيف، ومرطب هايلورونيك أسيد لبشرة نضرة ومشرقة طوال اليوم.",
      categoryId: catBeauty.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "BEAUTY-SET-3" },
    update: { name: "طقم 3 منتجات", priceCents: 42000, stockQuantity: 25, productId: prodSkincare.id },
    create: { sku: "BEAUTY-SET-3", name: "طقم 3 منتجات", priceCents: 42000, stockQuantity: 25, productId: prodSkincare.id },
  });

  // Category 5 Products (Accessories)
  const prodPendant = await prisma.product.upsert({
    where: { slug: "sterling-silver-pendant" },
    update: {
      name: "سلسلة فضة إيطالي عيار 925 مطلية ذهب",
      description: "قلادة رقيقة بتصميم زهرة اللوتس الفرعونية مصوغة من الفضة النقية والمطلية بطبقة ذهب عيار 18.",
      categoryId: catAccessories.id,
      status: ProductStatus.ACTIVE,
    },
    create: {
      name: "سلسلة فضة إيطالي عيار 925 مطلية ذهب",
      slug: "sterling-silver-pendant",
      description: "قلادة رقيقة بتصميم زهرة اللوتس الفرعونية مصوغة من الفضة النقية والمطلية بطبقة ذهب عيار 18.",
      categoryId: catAccessories.id,
      status: ProductStatus.ACTIVE,
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "ACCESSORY-SILVER-1" },
    update: { name: "زهرة اللوتس - ذهبي", priceCents: 34000, stockQuantity: 20, productId: prodPendant.id },
    create: { sku: "ACCESSORY-SILVER-1", name: "زهرة اللوتس - ذهبي", priceCents: 34000, stockQuantity: 20, productId: prodPendant.id },
  });

  // Homepage sections
  const homepageDefaults: { type: HomepageSectionType; title: string; sortOrder: number; isEnabled: boolean }[] = [
    { type: HomepageSectionType.CATEGORIES, title: "تسوق حسب القسم", sortOrder: 10, isEnabled: true },
    { type: HomepageSectionType.NEW_ARRIVALS, title: "وصل حديثًا", sortOrder: 20, isEnabled: true },
    { type: HomepageSectionType.BEST_SELLERS, title: "الأكثر مبيعًا", sortOrder: 30, isEnabled: true },
    { type: HomepageSectionType.FEATURED_COLLECTIONS, title: "مجموعات مختارة", sortOrder: 40, isEnabled: false },
    { type: HomepageSectionType.SEASONAL_OFFERS, title: "عروض الموسم", sortOrder: 50, isEnabled: false },
    { type: HomepageSectionType.BRAND_STORY, title: "قصة المتجر", sortOrder: 60, isEnabled: false },
    { type: HomepageSectionType.BENEFITS, title: "تجربة تسوق موثوقة", sortOrder: 70, isEnabled: false },
  ];
  for (const section of homepageDefaults) {
    if (!(await prisma.homepageSection.findFirst({ where: { type: section.type }, select: { id: true } }))) {
      await prisma.homepageSection.create({ data: section });
    }
  }

  console.log("Database seeded successfully with catalog and homepage defaults.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
