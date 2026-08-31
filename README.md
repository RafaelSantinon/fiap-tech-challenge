# Oficina Mecânica — API (FIAP Tech Challenge FIAP · Fase 1)

## Stack

- **NestJS 11** (arquitetura em camadas, módulos em `src/modules`)
- **PostgreSQL 16** + **TypeORM** (entidades + migrations)
- **JWT** (access token de curta duração + refresh token com rotação)
- **Swagger** (documentação das APIs)
- **Jest** + **Supertest** (testes unitários e de integração)
- **Docker** / **docker-compose** (+ **SonarQube** para análise de código)

## Por que PostgreSQL?

Os dados do domínio são fortemente relacionais (usuários, tokens e, nas próximas
fases, clientes, veículos, ordens de serviço e peças, com integridade
referencial e transações). O PostgreSQL oferece robustez transacional (ACID),
tipos ricos (enum, `timestamptz`, `uuid`) e ótima integração com o TypeORM,
que já será usado nos demais módulos.

## Estrutura do projeto

```
docs/                  # guias detalhados (execução e análise com SonarQube)
local/                 # tudo para rodar local: Dockerfile, docker-compose, .env.example
  seeds/               # seed do admin (não vai para a imagem da aplicação)
src/
  modules/
    auth/              # login, refresh, logout, me + estratégia JWT
    users/             # módulo de usuários (CRUD, padrão NestJS)
    customers/         # cadastro de clientes (identificação por CPF/CNPJ)
    vehicles/          # cadastro de veículos (placa, marca, modelo, ano)
    services/          # catálogo de serviços (preço e tempo estimado)
    parts/             # catálogo de peças (código, preço e estoque)
    supplies/          # catálogo de insumos (unidade de medida e estoque)
    stock/             # reserva, consumo e devolução de estoque
    quotes/            # o orçamento: totais, status e consulta
    service-orders/    # a OS: entidades, máquina de status, CRUD e itens
    service-order-workflow/  # políticas: gera o orçamento, aprova, recusa
    service-order-metrics/   # tempo médio por status e por serviço
    notifications/     # envio do orçamento ao cliente (log nesta entrega)
  common/              # enums, decorators (@Public, @Roles, @CurrentUser, @IsDocument,
                       #   @IsPlate), guards RBAC, utils de validação e de normalização
  config/              # configuração e DataSource do TypeORM
  database/            # migrations
  health/              # health check
  test/                # testes de integração (e2e)
```

## Documentação

- [docs/como-executar.md](docs/como-executar.md) — pré-requisitos, subida da
  stack, variáveis de ambiente e problemas comuns.
- [docs/cadastro-clientes-veiculos.md](docs/cadastro-clientes-veiculos.md) —
  regras de validação de CPF/CNPJ e placa, normalização e inativação.
- [docs/catalogo-servicos-pecas-insumos.md](docs/catalogo-servicos-pecas-insumos.md) —
  campos de serviços, peças e insumos, normalização de código e o que já existe
  de controle de estoque.
- [docs/ordens-de-servico.md](docs/ordens-de-servico.md) — máquina de status,
  orçamento automático, movimentação de estoque, APIs públicas do cliente e
  métricas de tempo.
- [docs/analise-sonarqube.md](docs/analise-sonarqube.md) — passo a passo da
  análise estática e limites de recursos.

## Executando com Docker (recomendado)

Pré-requisitos: Docker e Docker Compose. Todos os arquivos de execução local
ficam na pasta `local/`.

```bash
cp local/.env.example local/.env      # ajuste os segredos se desejar
docker compose -f local/docker-compose.yml up --build
```

Isso sobe **PostgreSQL**, a **API** e o **SonarQube**. Um container `seed`
efêmero aplica as **migrations** e cria o **admin inicial** antes da API subir.
Em seguida:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Health check: <http://localhost:3000/health>
- SonarQube: <http://localhost:9000> (login inicial `admin` / `admin`)

O Swagger é agrupado por audiência: `auth` e `users`; o cadastro em `customers`
e `vehicles`; o catálogo em `services`, `parts` e `supplies`; e a ordem de
serviço em `service-orders` (a ordem em si), `service-order-items` (montagem),
`quotes` (orçamentos), `public` (o canal do cliente, sem token) e `metrics`.

Para parar: `docker compose -f local/docker-compose.yml down` (adicione `-v`
para apagar também os volumes de dados).

## Executando localmente (sem Docker para a API)

Pré-requisitos: Node 20+ e um PostgreSQL acessível.

```bash
npm install
cp local/.env.example local/.env               # configure o acesso ao banco
docker compose -f local/docker-compose.yml up -d db   # (ou use um Postgres próprio)

npm run migration:run                          # cria as tabelas
npm run seed                                   # cria o admin inicial
npm run start:dev                              # sobe a API em modo watch
```

> As variáveis de ambiente são lidas de `local/.env` (com fallback para `.env`
> na raiz).

## Fluxo de autenticação (exemplos)

Login (admin do seed — `admin@oficina.com` / `Admin@123` por padrão):

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","password":"Admin@123"}'
```

Resposta:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "expiresIn": 600,
  "tokenType": "Bearer",
  "user": { "id": "...", "email": "admin@oficina.com", "name": "Administrador", "role": "admin" }
}
```

Acessar rota protegida:

```bash
curl http://localhost:3000/auth/me -H 'Authorization: Bearer <accessToken>'
```

Renovar o access token:

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

Logout (revoga o refresh token):

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refreshToken>"}'
```

## Cadastro de clientes e veículos (exemplos)

Todas as rotas de cadastro exigem um access token de um usuário **admin**. As
regras de validação, normalização e inativação estão em
[docs/cadastro-clientes-veiculos.md](docs/cadastro-clientes-veiculos.md).

Cadastrar um cliente (o CPF/CNPJ pode vir com ou sem máscara e é validado pelos
dígitos verificadores):

```bash
curl -X POST http://localhost:3000/customers \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Maria Souza","document":"529.982.247-25","email":"maria@email.com","phone":"(11) 98888-7777"}'
```

Resposta:

```json
{
  "id": "b3f1c2a4-5d6e-7f80-91a2-b3c4d5e6f708",
  "name": "Maria Souza",
  "document": "52998224725",
  "documentType": "cpf",
  "email": "maria@email.com",
  "phone": "(11) 98888-7777",
  "isActive": true
}
```

Identificar o cliente pelo CPF/CNPJ:

```bash
curl http://localhost:3000/customers/document/52998224725 \
  -H 'Authorization: Bearer <accessToken>'
```

Cadastrar um veículo para esse cliente (placa antiga `ABC1234` ou Mercosul
`ABC1D23`, gravada sem máscara e em maiúsculas):

```bash
curl -X POST http://localhost:3000/vehicles \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"plate":"abc-1d23","brand":"Volkswagen","model":"Gol","year":2020,"customerId":"<customerId>"}'
```

Listar os veículos de um cliente:

```bash
curl 'http://localhost:3000/vehicles?customerId=<customerId>' \
  -H 'Authorization: Bearer <accessToken>'
```

`DELETE /customers/:id` e `DELETE /vehicles/:id` respondem `204` e **inativam**
o registro (`isActive: false`) em vez de apagá-lo; use `?includeInactive=true`
nas listagens para vê-lo e um `PATCH` com `{"isActive": true}` para reativá-lo.

## Catálogo de serviços, peças e insumos (exemplos)

Assim como o cadastro, todas as rotas do catálogo exigem um access token de um
usuário **admin**. Os campos de cada recurso e o alcance do controle de estoque
estão em
[docs/catalogo-servicos-pecas-insumos.md](docs/catalogo-servicos-pecas-insumos.md).

Cadastrar um serviço (preço e tempo estimado de execução):

```bash
curl -X POST http://localhost:3000/services \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Troca de óleo","description":"Substituição do óleo do motor e do filtro.","price":189.9,"estimatedMinutes":60}'
```

Cadastrar uma peça (o código é gravado sem espaços e em maiúsculas):

```bash
curl -X POST http://localhost:3000/parts \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"code":"flt oil-001","name":"Filtro de óleo","brand":"Bosch","unitPrice":49.9,"stockQuantity":10,"minimumStock":2}'
```

Resposta:

```json
{
  "id": "eb6e4078-8464-4a8c-bff8-c426dfb06bc8",
  "code": "FLTOIL-001",
  "name": "Filtro de óleo",
  "description": null,
  "brand": "Bosch",
  "unitPrice": 49.9,
  "stockQuantity": 10,
  "reservedQuantity": 0,
  "availableQuantity": 10,
  "minimumStock": 2,
  "isActive": true
}
```

Cadastrar um insumo (com unidade de medida `un`, `l`, `ml`, `kg` ou `g`):

```bash
curl -X POST http://localhost:3000/supplies \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"code":"OLEO-5W30","name":"Óleo sintético 5W30","unit":"l","unitPrice":38.5,"stockQuantity":40,"minimumStock":10}'
```

Identificar uma peça pelo código e abastecer o estoque:

```bash
curl http://localhost:3000/parts/code/fltoil-001 \
  -H 'Authorization: Bearer <accessToken>'

curl -X PATCH http://localhost:3000/parts/<id> \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"stockQuantity":25}'
```

`DELETE /services/:id`, `DELETE /parts/:id` e `DELETE /supplies/:id` respondem
`204` e **inativam** o item, do mesmo modo que o cadastro.

`reservedQuantity` é a quantidade já prometida a ordens de serviço aguardando
aprovação, e `availableQuantity` é o que ainda pode ser prometido — as duas são
mantidas pela Ordem de Serviço, nunca pelo `PATCH` do catálogo.

## Ordens de serviço e orçamento (exemplos)

As rotas de `/service-orders` e `/quotes` aceitam **admin e mecânico**; as duas
rotas de `/metrics` são só do **admin**; as de `/public/service-orders` **não
pedem token**. A etapa é entregue em cinco módulos — as regras de status, de
estoque e de geração do orçamento, e o desenho dos módulos, estão em
[docs/ordens-de-servico.md](docs/ordens-de-servico.md).

Abrir a ordem e iniciar o diagnóstico:

```bash
curl -X POST http://localhost:3000/service-orders \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"customerId":"<id>","vehicleId":"<id>","description":"Barulho na suspensão dianteira."}'

curl -X PATCH http://localhost:3000/service-orders/<id>/status \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"in_diagnosis"}'
```

Incluir os itens. O orçamento nasce sozinho quando os **três** grupos têm ao
menos um item:

```bash
curl -X POST http://localhost:3000/service-orders/<id>/services \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"serviceId":"<id>","quantity":1}'

curl -X POST http://localhost:3000/service-orders/<id>/parts \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"partId":"<id>","quantity":2}'

curl -X POST http://localhost:3000/service-orders/<id>/supplies \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"supplyId":"<id>","quantity":4}'
```

A resposta da terceira chamada já vem com o orçamento e a ordem aguardando
aprovação:

```json
{
  "id": "9c1f0a2e-3b4c-4d5e-8f90-a1b2c3d4e5f6",
  "number": "OS-000042",
  "status": "awaiting_approval",
  "statusDurations": { "received": 42, "in_diagnosis": 318 },
  "quote": {
    "status": "pending",
    "servicesTotal": 189.9,
    "partsTotal": 99.8,
    "suppliesTotal": 154,
    "totalAmount": 443.7
  }
}
```

O envio do e-mail aparece no log da aplicação:

```
[NotificationsService] E-mail do orçamento da ordem OS-000042 enviado para Maria Silva <maria@exemplo.com> no valor de R$ 443.70.
```

O cliente acompanha e responde pelo número da ordem, sem token:

```bash
curl http://localhost:3000/public/service-orders/OS-000042/status
# {"number":"OS-000042","status":"awaiting_approval"}

curl http://localhost:3000/public/service-orders/OS-000042/quote

curl -X POST http://localhost:3000/public/service-orders/OS-000042/quote/approve
# aprova, dá baixa no estoque e coloca a ordem em execução

curl -X POST http://localhost:3000/public/service-orders/OS-000042/quote/reject
# recusa, devolve a reserva de estoque e finaliza a ordem
```

Concluir e entregar, e depois consultar as métricas como admin:

```bash
curl -X PATCH http://localhost:3000/service-orders/<id>/status \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"finished"}'

curl -X PATCH http://localhost:3000/service-orders/<id>/status \
  -H 'Authorization: Bearer <accessToken>' \
  -H 'Content-Type: application/json' \
  -d '{"status":"delivered"}'

curl http://localhost:3000/metrics/service-orders/average-time-per-status \
  -H 'Authorization: Bearer <accessToken>'
# [{"status":"in_diagnosis","averageSeconds":318,"orders":4}, ...]

curl http://localhost:3000/metrics/services/average-execution-time \
  -H 'Authorization: Bearer <accessToken>'
# [{"serviceId":"...","serviceName":"Troca de óleo","averageSeconds":7200,"orders":8}]
```

O orçamento também é recurso próprio, útil para ver o que está parado
esperando o cliente:

```bash
curl 'http://localhost:3000/quotes?status=pending' \
  -H 'Authorization: Bearer <accessToken>'

curl http://localhost:3000/quotes/<id> \
  -H 'Authorization: Bearer <accessToken>'
```

`DELETE /service-orders/:id` responde `204` e **inativa** a ordem, devolvendo a
reserva de estoque se ela ainda aguardava aprovação. `?includeInactive=true`
traz as inativas de volta na listagem.

## Testes

```bash
npm test               # unitários
npm run test:cov       # unitários com cobertura (domínios de auth e de OS em 100%)
npm run test:e2e       # integração (requer Postgres — use: docker compose -f local/docker-compose.yml up -d db)
npm run test:e2e -- parts   # integração de um módulo só
```

Os testes de integração ficam em `src/test/`, **um arquivo por módulo**
(`parts.e2e-spec.ts`, `service-order-workflow.e2e-spec.ts`, ...), com o
bootstrap da aplicação e as fixtures compartilhados em `src/test/support/`.
Juntos eles exercitam as 62 rotas da API.

## Análise de código com SonarQube

O SonarQube sobe junto com a stack (`docker compose -f local/docker-compose.yml up`).
Após ele ficar disponível em <http://localhost:9000>:

1. Acesse com `admin` / `admin` (num volume novo o Sonar obriga a trocar a
   senha no primeiro acesso) e gere um **token** em *My Account → Security*.
2. Gere o relatório de cobertura: `npm run test:cov`.
3. Rode o scanner a partir da **raiz do projeto** (via Docker, sem instalar nada):

```bash
docker run --rm --network host \
  --cpus 2 --memory 2g \
  -e SONAR_SCANNER_JAVA_OPTS="-Xmx1g" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=local/sonar-project.properties \
  -Dsonar.token=<seu-token>
```

A configuração do projeto está em `local/sonar-project.properties`. O passo a
passo completo, com troubleshooting, está em
[docs/analise-sonarqube.md](docs/analise-sonarqube.md).
