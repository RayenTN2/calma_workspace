
import { prisma } from "@/infrastructure/database/prisma";

export async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function createUserWithVerification({
  firstName,
  lastName,
  email,
  passwordHash,
  profileType,
  codeHash,
  expiresAt,
}) {
  return prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      passwordHash,
      profileType,

      verificationCode: {
        create: {
          codeHash,
          expiresAt,
        },
      },
    },
  });
}

export async function updatePendingUser({
  userId,
  firstName,
  lastName,
  passwordHash,
  profileType,
  codeHash,
  expiresAt,
}) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      firstName,
      lastName,
      passwordHash,
      profileType,

      verificationCode: {
        upsert: {
          create: {
            codeHash,
            expiresAt,
          },
          update: {
            codeHash,
            expiresAt,
            createdAt: new Date(),
          },
        },
      },
    },
  });
}

export async function findUserWithVerification(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      verificationCode: true,
    },
  });
}

export async function activateUser(userId, verificationId) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: {
        id: userId,
        emailVerified: false,
      },
      data: {
        emailVerified: true,
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    await tx.emailVerificationCode.deleteMany({
      where: {
        id: verificationId,
        userId,
      },
    });

    return true;
  });
}


export async function createRefreshToken({
  userId,
  tokenHash,
  expiresAt,
}) {
  return prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

export async function findRefreshTokenWithUser(tokenHash) {
  return prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: true,
    },
  });
}

export async function revokeRefreshToken(tokenHash) {
  return prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}
