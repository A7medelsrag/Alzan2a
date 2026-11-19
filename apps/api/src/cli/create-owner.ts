import { createInterface } from "node:readline";
import { Prisma, PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { adminLoginSchema } from "@store/shared";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const username = await askLine("Owner username: ");
  const parsedUsername = adminLoginSchema.shape.username.safeParse(username);
  if (!parsedUsername.success) throw new Error("Username must be 3-64 lowercase letters, digits, dots, underscores, or hyphens");
  const password = await askSecret("Owner password (15-128 characters): ");
  if (password.length < 15 || password.length > 128 || isCommonPassword(password)) {
    throw new Error("Choose a non-common password between 15 and 128 characters");
  }
  if (await askSecret("Confirm owner password: ") !== password) {
    throw new Error("Passwords do not match");
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.$transaction(async (transaction) => {
    if (await transaction.adminAccount.count() !== 0) {
      throw new Error("An admin account already exists; the bootstrap command only creates the first Owner");
    }
    const owner = await transaction.adminAccount.create({
      data: {
        username: parsedUsername.data,
        passwordHash,
        mfaSecretEncrypted: "DISABLED",
      },
    });
    await transaction.auditLog.create({
      data: {
        actorId: owner.id,
        action: "ADMIN_OWNER_BOOTSTRAPPED",
        entity: "AdminAccount",
        entityId: owner.id,
      },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  process.stdout.write("\nOwner created.\n");
}

function askLine(prompt: string): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => readline.question(prompt, (answer) => {
    readline.close();
    resolve(answer);
  }));
}

function askSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new Error("Owner bootstrap must run in an interactive terminal");
  }
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      process.stdin.removeListener("data", onData);
      process.stdin.setRawMode(false);
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const character of chunk) {
        if (character === "\u0003") return finish(new Error("Owner bootstrap cancelled"));
        if (character === "\r" || character === "\n") return finish();
        if (character === "\u007f" || character === "\b") value = value.slice(0, -1);
        else value += character;
      }
    };
    process.stdin.on("data", onData);
  });
}

function isCommonPassword(password: string): boolean {
  return new Set([
    "123456789012345",
    "1234567890123456",
    "password123456789",
    "qwerty123456789",
    "111111111111111",
  ]).has(password.toLowerCase());
}

main()
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Owner bootstrap failed"}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
