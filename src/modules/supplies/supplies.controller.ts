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
import { SuppliesService } from './supplies.service';
import { CreateSupplyDto } from './dto/create-supply.dto';
import { UpdateSupplyDto } from './dto/update-supply.dto';
import { SupplyResponseDto } from './dto/supply-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('supplies')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('supplies')
export class SuppliesController {
  constructor(private readonly suppliesService: SuppliesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo insumo.' })
  @ApiCreatedResponse({ type: SupplyResponseDto })
  async create(@Body() dto: CreateSupplyDto): Promise<SupplyResponseDto> {
    const supply = await this.suppliesService.create(dto);
    return SupplyResponseDto.fromEntity(supply);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista os insumos disponíveis e a quantidade em estoque.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [SupplyResponseDto] })
  async findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<SupplyResponseDto[]> {
    const supplies = await this.suppliesService.findAll(includeInactive);
    return supplies.map(SupplyResponseDto.fromEntity);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Identifica um insumo pelo código.' })
  @ApiOkResponse({ type: SupplyResponseDto })
  async findByCode(@Param('code') code: string): Promise<SupplyResponseDto> {
    const supply = await this.suppliesService.findByCode(code);
    return SupplyResponseDto.fromEntity(supply);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um insumo pelo id.' })
  @ApiOkResponse({ type: SupplyResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SupplyResponseDto> {
    const supply = await this.suppliesService.findOne(id);
    return SupplyResponseDto.fromEntity(supply);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um insumo.' })
  @ApiOkResponse({ type: SupplyResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplyDto,
  ): Promise<SupplyResponseDto> {
    const supply = await this.suppliesService.update(id, dto);
    return SupplyResponseDto.fromEntity(supply);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa um insumo.' })
  @ApiNoContentResponse({ description: 'Insumo inativado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.suppliesService.remove(id);
  }
}
