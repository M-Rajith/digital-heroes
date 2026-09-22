import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { CreateScoreDto, UpdateScoreDto } from "./dto";

export const MAX_RETAINED_SCORES = 5;

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subs: SubscriptionsService,
  ) {}

  /** Latest 5 in reverse chronological order (most recent first). */
  async latestFive(userId: string) {
    return this.prisma.score.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: MAX_RETAINED_SCORES,
    });
  }

  async create(userId: string, dto: CreateScoreDto) {
    // PRD: real-time subscription validation on every authenticated request
    await this.subs.assertActive(userId);

    const date = new Date(dto.date);
    const clash = await this.prisma.score.findUnique({
      where: { userId_date: { userId, date } },
    });
    if (clash) {
      throw new ConflictException("SCORE_DUPLICATE_DATE");
    }

    return this.prisma.$transaction(async (tx) => {
      const score = await tx.score.create({ data: { userId, value: dto.value, date } });

      // Rolling window: keep only the latest 5 — evict the oldest
      const all = await tx.score.findMany({
        where: { userId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      });
      const excess = all.slice(MAX_RETAINED_SCORES);
      if (excess.length) {
        await tx.score.deleteMany({ where: { id: { in: excess.map((s) => s.id) } } });
      }
      return score;
    });
  }

  async update(userId: string, scoreId: string, dto: UpdateScoreDto) {
    await this.subs.assertActive(userId);
    const existing = await this.assertOwner(userId, scoreId);

    const data: Record<string, unknown> = {};
    if (dto.value != null) data.value = dto.value;
    if (dto.date != null) {
      const date = new Date(dto.date);
      if (date.getTime() !== existing.date.getTime()) {
        const clash = await this.prisma.score.findUnique({
          where: { userId_date: { userId, date } },
        });
        if (clash && clash.id !== scoreId) throw new ConflictException("SCORE_DUPLICATE_DATE");
      }
      data.date = date;
    }
    return this.prisma.score.update({ where: { id: scoreId }, data });
  }

  async remove(userId: string, scoreId: string) {
    await this.subs.assertActive(userId);
    await this.assertOwner(userId, scoreId);
    await this.prisma.score.delete({ where: { id: scoreId } });
    return { deleted: true };
  }

  private async assertOwner(userId: string, scoreId: string) {
    const score = await this.prisma.score.findUnique({ where: { id: scoreId } });
    if (!score) throw new NotFoundException("Score not found");
    if (score.userId !== userId) throw new ForbiddenException("Not your score");
    return score;
  }
}
