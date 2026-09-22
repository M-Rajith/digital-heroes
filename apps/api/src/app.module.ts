import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./common/prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module";
import { ScoresModule } from "./scores/scores.module";
import { CharitiesModule } from "./charities/charities.module";
import { DrawsModule } from "./draws/draws.module";
import { PrizesModule } from "./prizes/prizes.module";
import { WinnersModule } from "./winners/winners.module";
import { PaymentsModule } from "./payments/payments.module";
import { AdminModule } from "./admin/admin.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { DrawScheduler } from "./jobs/draw.scheduler";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "dev-secret",
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    SubscriptionsModule,
    ScoresModule,
    CharitiesModule,
    DrawsModule,
    PrizesModule,
    WinnersModule,
    PaymentsModule,
    AdminModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    DrawScheduler,
  ],
})
export class AppModule {}
