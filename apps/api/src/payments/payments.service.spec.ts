import { BadRequestException } from "@nestjs/common";
import { PaymentsService } from "./payments.service";

describe("payments webhook", () => {
  it("rejects an invalid signature", async () => {
    const prisma: any = { webhookEvent: { findUnique: jest.fn() } };
    const subs: any = { syncFromStripe: jest.fn() };
    const svc = new PaymentsService(prisma, subs);
    await expect(svc.handleWebhook(Buffer.from("{}"), "bad_sig")).rejects.toThrow(
      BadRequestException,
    );
    expect(subs.syncFromStripe).not.toHaveBeenCalled();
  });

  it("ignores duplicate event delivery (idempotency)", async () => {
    const prisma: any = {
      webhookEvent: {
        findUnique: jest.fn().mockResolvedValue({ id: "evt_1" }),
        create: jest.fn(),
      },
    };
    const subs: any = { syncFromStripe: jest.fn() };
    const svc = new PaymentsService(prisma, subs);

    // stub stripe verification
    (svc as any).stripe = {
      webhooks: { constructEvent: jest.fn().mockReturnValue({ id: "evt_1", type: "unknown" }) },
    };
    const res = await svc.handleWebhook(Buffer.from("{}"), "sig");
    expect(res).toEqual({ received: true, duplicate: true });
    expect(prisma.webhookEvent.create).not.toHaveBeenCalled();
    expect(subs.syncFromStripe).not.toHaveBeenCalled();
  });
});
