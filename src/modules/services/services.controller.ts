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
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('services')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo serviço no catálogo.' })
  @ApiCreatedResponse({ type: ServiceResponseDto })
  async create(@Body() dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const service = await this.servicesService.create(dto);
    return ServiceResponseDto.fromEntity(service);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os serviços disponíveis.' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [ServiceResponseDto] })
  async findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<ServiceResponseDto[]> {
    const services = await this.servicesService.findAll(includeInactive);
    return services.map(ServiceResponseDto.fromEntity);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um serviço pelo id.' })
  @ApiOkResponse({ type: ServiceResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ServiceResponseDto> {
    const service = await this.servicesService.findOne(id);
    return ServiceResponseDto.fromEntity(service);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um serviço.' })
  @ApiOkResponse({ type: ServiceResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const service = await this.servicesService.update(id, dto);
    return ServiceResponseDto.fromEntity(service);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa um serviço.' })
  @ApiNoContentResponse({ description: 'Serviço inativado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.servicesService.remove(id);
  }
}
