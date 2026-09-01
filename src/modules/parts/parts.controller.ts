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
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';
import { PartResponseDto } from './dto/part-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('parts')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra uma nova peça.' })
  @ApiCreatedResponse({ type: PartResponseDto })
  async create(@Body() dto: CreatePartDto): Promise<PartResponseDto> {
    const part = await this.partsService.create(dto);
    return PartResponseDto.fromEntity(part);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista as peças disponíveis e a quantidade em estoque.',
  })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [PartResponseDto] })
  async findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<PartResponseDto[]> {
    const parts = await this.partsService.findAll(includeInactive);
    return parts.map(PartResponseDto.fromEntity);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Identifica uma peça pelo código.' })
  @ApiOkResponse({ type: PartResponseDto })
  async findByCode(@Param('code') code: string): Promise<PartResponseDto> {
    const part = await this.partsService.findByCode(code);
    return PartResponseDto.fromEntity(part);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha uma peça pelo id.' })
  @ApiOkResponse({ type: PartResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PartResponseDto> {
    const part = await this.partsService.findOne(id);
    return PartResponseDto.fromEntity(part);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza uma peça.' })
  @ApiOkResponse({ type: PartResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePartDto,
  ): Promise<PartResponseDto> {
    const part = await this.partsService.update(id, dto);
    return PartResponseDto.fromEntity(part);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa uma peça.' })
  @ApiNoContentResponse({ description: 'Peça inativada.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.partsService.remove(id);
  }
}
