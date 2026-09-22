import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        charitySelection: {
          select: {
            percentage: true,
            charity: { select: { id: true, name: true, slug: true } },
          },
        },
        scores: { orderBy: { date: "desc" }, take: 5 },
        winners: {
          select: {
            id: true,
            tier: true,
            amount: true,
            status: true,
            createdAt: true,
            draw: { select: { cycleKey: true } },
            proof: { select: { status: true, fileUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    const subscriptions = user?.subscriptions ?? [];
    const subscription = subscriptions[0] ?? null;
    return { ...user, subscriptions: undefined, subscription };
  }
}
