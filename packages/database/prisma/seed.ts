import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("Admin#12345!", 10);
  const userHash = await bcrypt.hash("User#12345!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@digitalheroes.co.in" },
    update: {},
    create: { email: "admin@digitalheroes.co.in", passwordHash: adminHash, name: "Platform Admin", role: "ADMIN" },
  });

  const demo = await prisma.user.upsert({
    where: { email: "demo@digitalheroes.co.in" },
    update: {},
    create: { email: "demo@digitalheroes.co.in", passwordHash: userHash, name: "Demo Subscriber" },
  });

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: "sub_seed_demo" },
    update: {},
    create: {
      userId: demo.id,
      plan: "MONTHLY",
      status: "ACTIVE",
      stripeCustomerId: "cus_seed_demo",
      stripeSubscriptionId: "sub_seed_demo",
      currentPeriodEnd: new Date(Date.now() + 30 * 86400_000),
    },
  });

  const charities = [
    {
      name: "Fairway Futures", slug: "fairway-futures",
      description: "Golf coaching and equipment for underprivileged youth — turning fairways into classrooms for life skills.",
      imageUrl: "/charities/fairway-futures.jpg", isFeatured: true,
      events: [{ title: "Junior Open Golf Day", eventDate: new Date("2026-10-11"), location: "City Links Course" }],
    },
    {
      name: "GreenRoots Trust", slug: "greenroots-trust",
      description: "Restoring urban green spaces and building community gardens where neighborhoods can grow together.",
      imageUrl: "/charities/greenroots.jpg", isFeatured: true,
      events: [{ title: "Community Planting Day", eventDate: new Date("2026-10-04"), location: "Riverside Park" }],
    },
    {
      name: "Second Swing", slug: "second-swing",
      description: "Refurbished golf gear redistributed to schools, veterans' programs, and beginners' clubs nationwide.",
      imageUrl: "/charities/second-swing.jpg",
    },
    {
      name: "Caddie Scholars", slug: "caddie-scholars",
      description: "Scholarships for young caddies — funding tuition, transport, and tutoring so work on the course funds study off it.",
      imageUrl: "/charities/caddie-scholars.jpg",
    },
  ];

  for (const c of charities) {
    const { events, ...data } = c;
    const charity = await prisma.charity.upsert({
      where: { slug: c.slug },
      update: {},
      create: data,
    });
    for (const e of events ?? []) {
      await prisma.charityEvent.create({ data: { ...e, charityId: charity.id } });
    }
  }

  // Seed the demo user's charity selection at the PRD minimum of 10%
  const ff = await prisma.charity.findUnique({ where: { slug: "fairway-futures" } });
  await prisma.charitySelection.upsert({
    where: { userId: demo.id },
    update: {},
    create: { userId: demo.id, charityId: ff!.id, percentage: 10 },
  });

  // Demo scores (latest 5, reverse chronological when read)
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i * 7);
    const dateStr = d.toISOString().slice(0, 10);
    await prisma.score.upsert({
      where: { userId_date: { userId: demo.id, date: new Date(dateStr) } },
      update: {},
      create: { userId: demo.id, value: 28 + i * 3, date: new Date(dateStr) },
    });
  }

  console.log("Seed complete:", { admin: admin.email, demo: demo.email });
}

main().finally(() => prisma.$disconnect());
