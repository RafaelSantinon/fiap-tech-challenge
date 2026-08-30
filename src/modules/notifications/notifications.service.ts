import { Injectable, Logger } from '@nestjs/common';

export interface QuoteNotification {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  sendQuote(notification: QuoteNotification): void {
    const amount = notification.totalAmount.toFixed(2);
    this.logger.log(
      `E-mail do orçamento da ordem ${notification.orderNumber} enviado para ` +
        `${notification.customerName} <${notification.customerEmail}> ` +
        `no valor de R$ ${amount}.`,
    );
  }
}
