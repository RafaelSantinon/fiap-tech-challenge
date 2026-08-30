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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleResponseDto } from './dto/vehicle-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('vehicles')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um veículo para um cliente.' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  async create(@Body() dto: CreateVehicleDto): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.create(dto);
    return VehicleResponseDto.fromEntity(vehicle);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os veículos, opcionalmente de um cliente.' })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [VehicleResponseDto] })
  async findAll(
    @Query('customerId', new ParseUUIDPipe({ optional: true }))
    customerId: string | undefined,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<VehicleResponseDto[]> {
    const vehicles = await this.vehiclesService.findAll(
      customerId,
      includeInactive,
    );
    return vehicles.map(VehicleResponseDto.fromEntity);
  }

  @Get('plate/:plate')
  @ApiOperation({ summary: 'Identifica um veículo pela placa.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  async findByPlate(
    @Param('plate') plate: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.findByPlate(plate);
    return VehicleResponseDto.fromEntity(vehicle);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um veículo pelo id.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.findOne(id);
    return VehicleResponseDto.fromEntity(vehicle);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um veículo.' })
  @ApiOkResponse({ type: VehicleResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesService.update(id, dto);
    return VehicleResponseDto.fromEntity(vehicle);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa um veículo.' })
  @ApiNoContentResponse({ description: 'Veículo inativado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.vehiclesService.remove(id);
  }
}
