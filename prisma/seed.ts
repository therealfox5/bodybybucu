import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

async function main() {
  const adapter = new PrismaLibSql({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    // Create admin user
    const adminPassword = await hash("admin123", 12);
    await prisma.user.upsert({
      where: { email: "bucu@bodybybucu.com" },
      update: {},
      create: {
        email: "bucu@bodybybucu.com",
        name: "Bucu",
        hashedPassword: adminPassword,
        role: "ADMIN",
      },
    });

    // Delete dependent records first, then exercises
    await prisma.personalRecord.deleteMany();
    await prisma.exerciseSet.deleteMany();
    await prisma.exercise.deleteMany();

    // Seed exercise catalog — 6 exercises
    const exercises = [
      { name: "Push Ups", muscleGroup: "Chest", equipment: "Bodyweight", isCompound: true, isPRTracked: true },
      { name: "Pull Ups", muscleGroup: "Back", equipment: "Bodyweight", isCompound: true, isPRTracked: true },
      { name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell", isCompound: true, isPRTracked: true },
      { name: "Deadlift", muscleGroup: "Back", equipment: "Barbell", isCompound: true, isPRTracked: true },
      { name: "Bench Press", muscleGroup: "Chest", equipment: "Barbell", isCompound: true, isPRTracked: true },
      { name: "1 Mile Time", muscleGroup: "Cardio", equipment: "Bodyweight", isCompound: false, isPRTracked: true },
      { name: "0.25 Mile Time", muscleGroup: "Cardio", equipment: "Bodyweight", isCompound: false, isPRTracked: true },
    ];

    for (const exercise of exercises) {
      await prisma.exercise.create({ data: exercise });
    }

    // Seed default availability for admin trainer (Mon-Sat)
    const admin = await prisma.user.findUnique({ where: { email: "bucu@bodybybucu.com" } });
    if (admin) {
      await prisma.availability.deleteMany({ where: { trainerId: admin.id } });

      // Mon-Fri (dayOfWeek 0-4): 05:00-12:00, 60min slots
      for (let day = 0; day <= 4; day++) {
        await prisma.availability.create({
          data: {
            trainerId: admin.id,
            dayOfWeek: day,
            startTime: "05:00",
            endTime: "12:00",
            slotMinutes: 60,
            isActive: true,
          },
        });
      }

      // Saturday (dayOfWeek 5): 07:00-10:00, 60min slots
      await prisma.availability.create({
        data: {
          trainerId: admin.id,
          dayOfWeek: 5,
          startTime: "07:00",
          endTime: "10:00",
          slotMinutes: 60,
          isActive: true,
        },
      });
    }

    console.log("Seed complete!");
  } catch (e) {
    console.error(e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
