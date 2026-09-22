import "reflect-metadata";
import { ValidationPipe, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  // rawBody: true → req.rawBody populated (required for Stripe signature verification)
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "warn", "error"],
    rawBody: true,
  });
  app.use(helmet());
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );

  const config = new DocumentBuilder()
    .setTitle("Digital Heroes API")
    .setDescription("Golf performance · charity · monthly draw platform")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const doc = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, doc);

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  new Logger("Bootstrap").log(`API ready on :${port} — docs at /api/docs`);
}
bootstrap();
