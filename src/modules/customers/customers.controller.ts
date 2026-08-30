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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerResponseDto } from './dto/customer-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';

@ApiTags('customers')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um novo cliente.' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  async create(@Body() dto: CreateCustomerDto): Promise<CustomerResponseDto> {
    const customer = await this.customersService.create(dto);
    return CustomerResponseDto.fromEntity(customer);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os clientes cadastrados.' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiOkResponse({ type: [CustomerResponseDto] })
  async findAll(
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ): Promise<CustomerResponseDto[]> {
    const customers = await this.customersService.findAll(includeInactive);
    return customers.map(CustomerResponseDto.fromEntity);
  }

  @Get('document/:document')
  @ApiOperation({ summary: 'Identifica um cliente pelo CPF/CNPJ.' })
  @ApiOkResponse({ type: CustomerResponseDto })
  async findByDocument(
    @Param('document') document: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customersService.findByDocument(document);
    return CustomerResponseDto.fromEntity(customer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente pelo id.' })
  @ApiOkResponse({ type: CustomerResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customersService.findOne(id);
    return CustomerResponseDto.fromEntity(customer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um cliente.' })
  @ApiOkResponse({ type: CustomerResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    const customer = await this.customersService.update(id, dto);
    return CustomerResponseDto.fromEntity(customer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Inativa um cliente.' })
  @ApiNoContentResponse({ description: 'Cliente inativado.' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.customersService.remove(id);
  }
}
