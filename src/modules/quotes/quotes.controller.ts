import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { QuoteStatus } from '../../common/enums/quote-status.enum';
import { QuotesService } from './quotes.service';
import { QuoteResponseDto } from './dto/quote-response.dto';

@ApiTags('quotes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito à equipe da oficina.' })
@Roles(UserRole.ADMIN, UserRole.MECHANIC)
@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista os orçamentos gerados.' })
  @ApiQuery({ name: 'status', required: false, enum: QuoteStatus })
  @ApiQuery({ name: 'serviceOrderId', required: false, type: String })
  @ApiOkResponse({ type: [QuoteResponseDto] })
  async findAll(
    @Query('status', new ParseEnumPipe(QuoteStatus, { optional: true }))
    status: QuoteStatus | undefined,
    @Query('serviceOrderId', new ParseUUIDPipe({ optional: true }))
    serviceOrderId: string | undefined,
  ): Promise<QuoteResponseDto[]> {
    const quotes = await this.quotesService.findAll(status, serviceOrderId);
    return quotes.map(QuoteResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um orçamento pelo id.' })
  @ApiOkResponse({ type: QuoteResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuoteResponseDto> {
    const quote = await this.quotesService.findOne(id);
    return QuoteResponseDto.fromEntity(quote);
  }
}
