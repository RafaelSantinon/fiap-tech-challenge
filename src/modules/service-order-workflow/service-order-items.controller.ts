import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ServiceOrderWorkflowService } from './service-order-workflow.service';
import { AddOrderServiceDto } from '../service-orders/dto/add-order-service.dto';
import { AddOrderPartDto } from '../service-orders/dto/add-order-part.dto';
import { AddOrderSupplyDto } from '../service-orders/dto/add-order-supply.dto';
import { UpdateOrderItemDto } from '../service-orders/dto/update-order-item.dto';
import { ServiceOrderResponseDto } from '../service-orders/dto/service-order-response.dto';

@ApiTags('service-order-items')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito à equipe da oficina.' })
@Roles(UserRole.ADMIN, UserRole.MECHANIC)
@Controller('service-orders/:orderId')
export class ServiceOrderItemsController {
  constructor(private readonly workflowService: ServiceOrderWorkflowService) {}

  @Post('services')
  @ApiOperation({
    summary:
      'Inclui um serviço na ordem. Ao completar serviços, peças e insumos o orçamento é gerado.',
  })
  @ApiCreatedResponse({ type: ServiceOrderResponseDto })
  async addService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddOrderServiceDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.addService(orderId, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Post('parts')
  @ApiOperation({
    summary:
      'Inclui uma peça na ordem. Ao completar serviços, peças e insumos o orçamento é gerado.',
  })
  @ApiCreatedResponse({ type: ServiceOrderResponseDto })
  async addPart(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddOrderPartDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.addPart(orderId, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Post('supplies')
  @ApiOperation({
    summary:
      'Inclui um insumo na ordem. Ao completar serviços, peças e insumos o orçamento é gerado.',
  })
  @ApiCreatedResponse({ type: ServiceOrderResponseDto })
  async addSupply(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: AddOrderSupplyDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.addSupply(orderId, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Patch('services/:itemId')
  @ApiOperation({ summary: 'Atualiza a quantidade de um serviço da ordem.' })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async updateService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.updateService(
      orderId,
      itemId,
      dto,
    );
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Patch('parts/:itemId')
  @ApiOperation({ summary: 'Atualiza a quantidade de uma peça da ordem.' })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async updatePart(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.updatePart(orderId, itemId, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Patch('supplies/:itemId')
  @ApiOperation({ summary: 'Atualiza a quantidade de um insumo da ordem.' })
  @ApiOkResponse({ type: ServiceOrderResponseDto })
  async updateSupply(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateOrderItemDto,
  ): Promise<ServiceOrderResponseDto> {
    const order = await this.workflowService.updateSupply(orderId, itemId, dto);
    return ServiceOrderResponseDto.fromEntity(order);
  }

  @Delete('services/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um serviço da ordem.' })
  @ApiNoContentResponse({ description: 'Serviço removido da ordem.' })
  async removeService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.workflowService.removeService(orderId, itemId);
  }

  @Delete('parts/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma peça da ordem.' })
  @ApiNoContentResponse({ description: 'Peça removida da ordem.' })
  async removePart(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.workflowService.removePart(orderId, itemId);
  }

  @Delete('supplies/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um insumo da ordem.' })
  @ApiNoContentResponse({ description: 'Insumo removido da ordem.' })
  async removeSupply(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<void> {
    await this.workflowService.removeSupply(orderId, itemId);
  }
}
