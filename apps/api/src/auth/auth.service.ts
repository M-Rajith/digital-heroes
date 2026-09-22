import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../common/prisma/prisma.service";
import { LoginDto, SignupDto } from "./dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        charitySelection:
          dto.charityId != null
            ? {
                create: {
                  charityId: dto.charityId,
                  percentage: dto.charityPercentage ?? 10,
                },
              }
            : undefined,
      },
      include: { charitySelection: true },
    });

    return { token: this.sign(user.id, user.email, user.role), user: this.safeUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    return { token: this.sign(user.id, user.email, user.role), user: this.safeUser(user) };
  }

  // NOTE: synchronous sign() — signAsync returns a Promise which would
  // serialize to {} in the response body.
  private sign(id: string, email: string, role: string) {
    return this.jwt.sign({ sub: id, email, role });
  }

  private safeUser(u: Record<string, unknown>) {
    const { passwordHash: _ignored, ...rest } = u as Record<string, unknown> & { passwordHash: string };
    return rest;
  }
}
