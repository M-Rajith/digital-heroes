import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma/prisma.service";
import { VerifyWinnerDto } from "./dto";

/**
 * Winner verification state machine (PRD §09):
 *   PENDING_VERIFICATION → (proof approved) → VERIFIED → PAID
 *                      └─→ (proof rejected) → REJECTED
 */
@Injectable()
export class WinnersService {
  constructor(private readonly prisma: PrismaService) {}

  forUser(userId: string) {
    return this.prisma.winner.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        draw: { select: { cycleKey: true, winningNumbers: true } },
        proof: true,
      },
    });
  }

  all() {
    return this.prisma.winner.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        draw: { select: { cycleKey: true } },
        proof: true,
      },
    });
  }

  async uploadProof(userId: string, winnerId: string, file: Express.Multer.File) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
      include: { proof: true },
    });
    if (!winner) throw new NotFoundException("Winner record not found");
    if (winner.userId !== userId) throw new ForbiddenException("Not your win");
    if (winner.status !== "PENDING_VERIFICATION") {
      throw new BadRequestException("Verification already completed for this win");
    }
    if (!/^image\/(png|jpe?g|webp)$/.test(file.mimetype)) {
      throw new BadRequestException("Proof must be a PNG, JPG, or WebP image");
    }
    if (file.size > 5 * 1024 * 1024) throw new BadRequestException("Proof image must be under 5MB");

    // Store the binary in Supabase Storage — never inside PostgreSQL.
    const path = `${winnerId}/${Date.now()}-${file.originalname.replace(/[^\w.\-]/g, "_")}`;
    const fileUrl = await this.persistToStorage(path, file);

    return this.prisma.$transaction(async (tx) => {
      if (winner.proof) {
        await tx.winnerProof.delete({ where: { id: winner.proof.id } });
      }
      return tx.winnerProof.create({
        data: { winnerId, fileUrl, storagePath: path, status: "PENDING" },
      });
    });
  }

  async verify(adminId: string, winnerId: string, dto: VerifyWinnerDto) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
      include: { proof: true },
    });
    if (!winner) throw new NotFoundException("Winner not found");
    if (winner.status !== "PENDING_VERIFICATION") {
      throw new BadRequestException("Winner is not pending verification");
    }
    if (!winner.proof) throw new BadRequestException("No proof uploaded yet");

    const next = dto.approve ? "VERIFIED" : "REJECTED";
    const [updated] = await this.prisma.$transaction([
      this.prisma.winner.update({ where: { id: winnerId }, data: { status: next } }),
      this.prisma.winnerProof.update({
        where: { winnerId },
        data: { status: dto.approve ? "APPROVED" : "REJECTED", reviewedBy: adminId, reviewedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: dto.approve ? "winner.approve" : "winner.reject",
          entityType: "winner",
          entityId: winnerId,
          newValue: { status: next, reason: dto.reason },
        },
      }),
    ]);
    return updated;
  }

  async markPaid(adminId: string, winnerId: string) {
    const winner = await this.prisma.winner.findUnique({ where: { id: winnerId } });
    if (!winner) throw new NotFoundException("Winner not found");
    if (winner.status !== "VERIFIED") {
      throw new BadRequestException("Only VERIFIED winners can be marked paid");
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.winner.update({ where: { id: winnerId }, data: { status: "PAID", paidAt: new Date() } }),
      this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          action: "winner.payout",
          entityType: "winner",
          entityId: winnerId,
          newValue: { amount: winner.amount.toString(), paidAt: new Date().toISOString() },
        },
      }),
    ]);
    return updated;
  }

  private async persistToStorage(path: string, file: Express.Multer.File): Promise<string> {
    // Supabase Storage via REST. Falls back to a local stub in dev when
    // SUPABASE_* env is unset, so the verification flow is testable end-to-end.
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "winner-proofs";
    if (!url || !key) return `local://${bucket}/${path}`;

    const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": file.mimetype,
        "x-upsert": "true",
      },
      body: new Uint8Array(file.buffer) as unknown as BodyInit,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new BadRequestException(`Storage upload failed: ${res.status} ${detail}`.slice(0, 300));
    }
    return `${url}/storage/v1/object/public/${bucket}/${path}`;
  }
}
