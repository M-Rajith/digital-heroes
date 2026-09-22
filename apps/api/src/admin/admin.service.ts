import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";
import { PrismaService } from "../common/prisma/prisma.service";
import {
  AdminUpdateScoreDto,
  AdminUpdateUserDto,
  ListUsersDto,
  UpsertCharityDto,
} from "./dto";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(q: ListUsersDto) {
    const page = q.page ?? 1;
    const limit = q.limit ?? 20;

    const where: Prisma.UserWhereInput = {
      ...(q.q
        ? {
            OR: [
              { email: { contains: q.q, mode: "insensitive" } },
              { name: { contains: q.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(q.status === "active"
        ? { subscriptions: { some: { status: SubscriptionStatus.ACTIVE } } }
        : {}),
      ...(q.status === "lapsed"
        ? { subscriptions: { none: { status: SubscriptionStatus.ACTIVE } } }
        : {}),
    };

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, name: true, role: true, createdAt: true,
          subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
          charitySelection: { select: { percentage: true, charity: { select: { name: true } } } },
        },
      }),
    ]);

    return { total, page, limit, items };
  }

  async updateUser(adminId: string, userId: string, dto: AdminUpdateUserDto) {
    const before = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!before) throw new NotFoundException("User not found");

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name, role: dto.role },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: "user.update",
        entityType: "user",
        entityId: userId,
        oldValue: { name: before.name, role: before.role },
        newValue: { name: updated.name, role: updated.role },
      },
    });
    return updated;
  }

  async updateScore(adminId: string, scoreId: string, dto: AdminUpdateScoreDto) {
    const before = await this.prisma.score.findUnique({ where: { id: scoreId } });
    if (!before) throw new NotFoundException("Score not found");

    const data: Record<string, unknown> = {};
    if (dto.value != null) data.value = dto.value;
    if (dto.date != null) data.date = new Date(dto.date);

    const [updated] = await this.prisma.$transaction([
      this.prisma.score.update({ where: { id: scoreId }, data }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: "score.update",
          entityType: "score",
          entityId: scoreId,
          oldValue: { value: before.value, date: before.date.toISOString() },
          newValue: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
        },
      }),
    ]);
    return updated;
  }

  createCharity(dto: UpsertCharityDto) {
    return this.prisma.charity.create({ data: dto });
  }

  async updateCharity(id: string, dto: UpsertCharityDto) {
    const exists = await this.prisma.charity.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Charity not found");
    return this.prisma.charity.update({ where: { id }, data: dto });
  }

  async setCharityActive(id: string, active: boolean) {
    const exists = await this.prisma.charity.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException("Charity not found");
    return this.prisma.charity.update({ where: { id }, data: { isActive: active } });
  }
}
