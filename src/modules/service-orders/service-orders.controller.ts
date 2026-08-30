import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ServiceOrderStatus } from '../../common/enums/service-order-status.enum';
import { ServiceOrdersService } from './service-orders.service';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { UpdateServiceOrderDto } from './dto/update-service-order.dto';
import { ChangeServiceOrderStatusDto } from './dto/change-service-order-status.dto';
import { ServiceOrderResponseDto } from './dto/service-order-response.dto';

@ApiTags('service-orders')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito à equipe da oficina.' })
@Roles(UserRole.ADMIN, UserRole.MECHANIC)
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(private readonly serviceOrdersService: ServiceOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Abre uma ordem de serviço para um veículo.' })
  @ApiCreatedResponse({ type: ServiceOrderResponseDto })
  async create(
    @Body() dto: CreateServiceOrderDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.serviceOrdersService.create(dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Get()
  @ApiOperation({ summary: 'Lista as ordens de serviço.' })
  @ApiQuery({ name: 'status', required: false, enum: ServiceOrderStatus })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'vehicleId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [ServiceOrderResponseDto] })
  async findAll(
    @Query('status', new ParseEnumPipe(ServiceOrderStatus, { optional: true }))
    status: ServiceOrderStatus | undefined,
    @Query('customerId', new ParseUUIDPipe({ optional: true }))
    customerId: string | undefined,
    @Query('vehicleId', new ParseUUIDPipe({ optional: true }))
    vehicleId: string | undefined,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<ServiceOrderResponseDto[]> {
    const orders = await this.serviceOrdersService.findAll(
      status,
      customerId,
      vehicleId,
      includeInactive,
    );
    return orders.map(ServiceOrderResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalha uma ordem de serviço com itens e orçamento.',
  })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.serviceOrdersService.findOne(id);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza a descrição de uma ordem de serviço.' })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceOrderDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.serviceOrdersService.update(id, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Avança manualmente o status de uma ordem de serviço.',
  })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeServiceOrderStatusDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.serviceOrdersService.changeStatusManually(
      id,
      dto.status,
    );
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa uma ordem de serviço.' })
  @ApiNoContentResponse({ description: 'Ordem de serviço inativada.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.serviceOrdersService.remove(id);
  }
}
