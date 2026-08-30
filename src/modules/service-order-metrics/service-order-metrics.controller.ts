import { Controller, Get } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ServiceOrderMetricsService } from './service-order-metrics.service';
import { StatusAverageResponseDto } from './dto/status-average-response.dto';
import { ServiceExecutionAverageResponseDto } from './dto/service-execution-average-response.dto';

@ApiTags('metrics')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Token ausente ou inválido.' })
@ApiForbiddenResponse({ description: 'Acesso restrito a administradores.' })
@Roles(UserRole.ADMIN)
@Controller('metrics')
export class ServiceOrderMetricsController {
  constructor(private readonly metricsService: ServiceOrderMetricsService) {}

  @Get('service-orders/average-time-per-status')
  @ApiOperation({
    summary: 'Tempo médio que as ordens ficam em cada status, em segundos.',
  })
  @ApiOkResponse({ type: [StatusAverageResponseDto] })
  averageTimePerStatus(): Promise<StatusAverageResponseDto[]> {
    return this.metricsService.averageTimePerStatus();
  }

  @Get('services/average-execution-time')
  @ApiOperation({
    summary: 'Tempo médio em execução por serviço, em segundos.',
  })
  @ApiOkResponse({ type: [ServiceExecutionAverageResponseDto] })
  averageExecutionTimePerService(): Promise<
    ServiceExecutionAverageResponseDto[]
  > {
    return this.metricsService.averageExecutionTimePerService();
  }
}
