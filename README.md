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
  common/              # enums, decorators (@Public, @Roles, @CurrentUser, @IsDocument,
                       #   @IsPlate), guards RBAC e utils de validação
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

## Testes

```bash
npm test           # unitários
npm run test:cov   # unitários com cobertura (domínio de auth ~100%)
npm run test:e2e   # integração (requer Postgres — use: docker compose -f local/docker-compose.yml up -d db)
```

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
