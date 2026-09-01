import { ApiProperty } from '@nestjs/swagger';

export class ServiceExecutionAverageResponseDto {
  @ApiProperty({ example: 'd5b3e4c6-7f80-9102-b3c4-d5e6f7081920' })
  serviceId: string;

  @ApiProperty({ example: 'Troca de óleo' })
  serviceName: string;

  @ApiProperty({
    example: 7200,
    description: 'Tempo médio em execução, em segundos.',
  })
  averageSeconds: number;

  @ApiProperty({
    example: 8,
    description: 'Ordens concluídas com este serviço.',
  })
  orders: number;
}
