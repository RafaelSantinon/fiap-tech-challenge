import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Oficina Mecânica API')
    .setDescription(
      'Sistema Integrado de Atendimento e Execução de Serviços — ' +
        'autenticação, cadastro, catálogo e ordens de serviço.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .addTag('auth', 'Login, refresh com rotação e logout por revogação.')
    .addTag('users', 'Usuários da oficina e seus papéis. Restrito ao admin.')
    .addTag('customers', 'Clientes, identificados por CPF ou CNPJ.')
    .addTag('vehicles', 'Veículos, sempre vinculados a um cliente.')
    .addTag('services', 'Catálogo de serviços executados pela oficina.')
    .addTag('parts', 'Catálogo de peças, com preço e estoque.')
    .addTag('supplies', 'Catálogo de insumos, com unidade de medida e estoque.')
    .addTag(
      'service-orders',
      'Ordem de serviço: abertura, consulta, inativação e avanço manual de status.',
    )
    .addTag(
      'service-order-items',
      'Montagem da ordem. Ao completar serviços, peças e insumos o orçamento é gerado.',
    )
    .addTag('quotes', 'Orçamentos gerados, com filtro por status e por ordem.')
    .addTag(
      'public',
      'Canal do cliente, sem autenticação: acompanhar a ordem e responder o orçamento.',
    )
    .addTag(
      'metrics',
      'Tempo médio por status e por serviço. Restrito ao admin.',
    )
    .addTag('health', 'Verificação de que a aplicação está no ar.')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get<number>('port', 3000);
  await app.listen(port);
  console.log(`Aplicação rodando em http://localhost:${port} (docs em /docs)`);
}

void bootstrap();
