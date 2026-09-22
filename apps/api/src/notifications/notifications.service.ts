import { Injectable, Logger } from "@nestjs/common";

/**
 * Notification abstraction. Wire in Resend/SendGrid/Postmark in production;
 * logs locally so the full flow is observable in dev and tests.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger("Notify");

  async drawPublished(cycleKey: string, winnerCount: number) {
    this.logger.log(`[email] Draw ${cycleKey} published — ${winnerCount} winner(s).`);
  }

  async winnerNotified(email: string, tier: number, amount: string) {
    this.logger.log(`[email] → ${email}: You won a tier-${tier} prize of ${amount}! Upload your proof.`);
  }

  async payoutCompleted(email: string, amount: string) {
    this.logger.log(`[email] → ${email}: Your payout of ${amount} is complete.`);
  }

  async subscriptionLapsed(email: string) {
    this.logger.log(`[email] → ${email}: Your subscription has lapsed — resubscribe to keep playing.`);
  }
}
