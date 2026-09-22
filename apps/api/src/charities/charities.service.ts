import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { SelectCharityDto } from "./dto";

@Injectable()
export class CharitiesService {
  constructor(private readonly prisma: PrismaService) {}

  directory(q?: string, featuredOnly = false) {
    return this.prisma.charity.findMany({
      where: {
        isActive: true,
        ...(featuredOnly ? { isFeatured: true } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { events: { orderBy: { eventDate: "asc" } } },
      orderBy: [{ isFeatured: "desc" }, { name: "asc" }],
    });
  }

  async detail(slug: string) {
    const charity = await this.prisma.charity.findUnique({
      where: { slug },
      include: { events: { orderBy: { eventDate: "asc" } } },
    });
    if (!charity || !charity.isActive) throw new NotFoundException("Charity not found");
    return charity;
  }

  async select(userId: string, dto: SelectCharityDto) {
    const charity = await this.prisma.charity.findUnique({ where: { id: dto.charityId } });
    if (!charity || !charity.isActive) throw new NotFoundException("Charity not found");

    return this.prisma.charitySelection.upsert({
      where: { userId },
      update: { charityId: dto.charityId, percentage: dto.percentage },
      create: { userId, charityId: dto.charityId, percentage: dto.percentage },
    });
  }

  /** Total charitable contribution across active subscribers (for analytics). */
  async contributionTotals() {
    const rows = await this.prisma.charitySelection.findMany({
      include: { charity: { select: { id: true, name: true, slug: true } } },
    });
    const subs = await this.prisma.subscription.count({ where: { status: "ACTIVE" } });
    return rows.map((r) => ({
      charity: r.charity,
      percentage: r.percentage,
      estimatedMonthlyContribution: null, // computed by analytics with real prices
      activeSubscribers: subs,
    }));
  }
}
