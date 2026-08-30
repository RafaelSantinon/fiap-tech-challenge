import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ServiceOrdersService } from '../service-orders/service-orders.service';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';
import { OrderStatusResponseDto } from './dto/order-status-response.dto';
import { PublicQuoteResponseDto } from './dto/public-quote-response.dto';

@ApiTags('public')
@ApiNotFoundResponse({ description: 'Ordem de serviço não encontrada.' })
@Public()
@Controller('public/service-orders')
export class PublicServiceOrdersController {
  constructor(
    private readonly serviceOrdersService: ServiceOrdersService,
    private readonly workflowService: ServiceOrderWorkflowService,
  ) {}

  @Get(':number/status')
  @ApiOperation({
    summary: 'Consulta o status de uma ordem de serviço pelo número.',
  })
  @ApiOkResponse({ type: OrderStatusResponseDto })
  async findStatus(
    @Param('number') number: string,
  ): Promise<OrderStatusResponseDto> {
    const order = await this.serviceOrdersService.findByNumber(number);
    return { number: order.number, status: order.status };
  }

  @Get(':number/quote')
  @ApiOperation({ summary: 'Consulta o orçamento de uma ordem de serviço.' })
  @ApiOkResponse({ type: PublicQuoteResponseDto })
  async findQuote(
    @Param('number') number: string,
  ): Promise<PublicQuoteResponseDto> {
    const { order, quote } =
      await this.workflowService.findQuoteByNumber(number);
    return PublicQuoteResponseDto.fromEntities(order, quote);
  }

  @Post(':number/quote/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprova o orçamento e coloca a ordem em execução.',
  })
  @ApiOkResponse({ type: PublicQuoteResponseDto })
  async approve(
    @Param('number') number: string,
  ): Promise<PublicQuoteResponseDto> {
    const { order, quote } = await this.workflowService.approve(number);
    return PublicQuoteResponseDto.fromEntities(order, quote);
  }

  @Post(':number/quote/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Recusa o orçamento e finaliza a ordem.' })
  @ApiOkResponse({ type: PublicQuoteResponseDto })
  async reject(
    @Param('number') number: string,
  ): Promise<PublicQuoteResponseDto> {
    const { order, quote } = await this.workflowService.reject(number);
    return PublicQuoteResponseDto.fromEntities(order, quote);
  }
}
