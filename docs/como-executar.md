# Como executar o projeto

Guia de execução local da API da Oficina Mecânica (NestJS + PostgreSQL).
Para a análise estática, veja [analise-sonarqube.md](analise-sonarqube.md).

## Pré-requisitos

| Ferramenta | Versão mínima | Observação |
| ---------- | ------------- | ---------- |
| Docker | 24+ | inclui o plugin `docker compose` (v2) |
| Node.js | 20+ | só é necessário para rodar a API fora do container |
| npm | 10+ | acompanha o Node |

Tudo que é necessário para subir o ambiente local mora na pasta `local/`:
`Dockerfile`, `docker-compose.yml`, `.env.example` e `sonar-project.properties`.

> **Docker context:** neste ambiente o daemon roda no context `default`. Se o
> `docker compose` reclamar que não encontra o daemon, rode `docker context use default`.

## Opção 1 — Tudo em Docker (recomendado)

```bash
cd <raiz-do-projeto>
cp local/.env.example local/.env     # ajuste os segredos se quiser
docker compose -f local/docker-compose.yml up -d --build
```

Isso sobe cinco containers:

| Container | Serviço | Porta |
| --------- | ------- | ----- |
| `oficina-api` | API NestJS | 3000 |
| `oficina-db` | PostgreSQL 16 (dados da aplicação) | 5432 |
| `oficina-seed` | migrations, admin e dados de demonstração (roda uma vez e encerra) | — |
| `oficina-sonarqube` | SonarQube Community | 9000 |
| `oficina-sonar-db` | PostgreSQL 16 (dados do SonarQube) | interna |

O serviço `seed` roda assim que o banco fica saudável e executa dois passos:
`seed-admin.ts` aplica as **migrations** e cria o **administrador inicial**, e
`seed-demo.ts` popula o banco com **dados de demonstração** — clientes,
veículos, catálogo e 44 ordens de serviço distribuídas pelos seis status, com
orçamentos, estoque reservado e as métricas já respondendo. Depois o container
encerra, e a API só sobe quando ele termina com sucesso
(`service_completed_successfully`).

Os dois são idempotentes: se o admin já existir ou se já houver dados de
demonstração, não fazem nada. O que cada um cria e como usar está em
[dados-de-demonstracao.md](dados-de-demonstracao.md).

O seed vive em `local/seeds/seed-admin.ts`, fora de `src/`, porque é um recurso
exclusivo do ambiente local: o estágio de runtime do `local/Dockerfile` copia
apenas o `dist/`, então ele **não vai para a imagem da aplicação**.

Depois de subir:

- API: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Health check: <http://localhost:3000/health>
- SonarQube: <http://localhost:9000>

### Verificar se subiu

```bash
docker compose -f local/docker-compose.yml ps
curl -s http://localhost:3000/health
docker logs -f oficina-api          # acompanhar o boot / seed
```

### Parar

```bash
docker compose -f local/docker-compose.yml down       # para os containers
docker compose -f local/docker-compose.yml down -v    # + apaga os volumes de dados
```

> `down -v` apaga também o banco do SonarQube — você perderá o histórico de
> análises e a senha do admin do Sonar voltará para o padrão.

## Opção 2 — API local, banco em Docker

Útil para desenvolver com hot reload.

```bash
npm install
cp local/.env.example local/.env

# só o banco da aplicação
docker compose -f local/docker-compose.yml up -d db

npm run migration:run     # cria as tabelas
npm run seed              # cria o admin inicial (local/seeds/seed-admin.ts)
npm run seed:demo         # popula os dados de demonstração (opcional)
npm run start:dev         # API em modo watch na porta 3000
```

As variáveis são lidas de `local/.env`, com fallback para um `.env` na raiz
(veja `src/config/typeorm.config.ts` e o `envFilePath` do `AppModule`).

## Variáveis de ambiente

Referência completa em `local/.env.example`. As que mais importam:

| Variável | Padrão | Descrição |
| -------- | ------ | --------- |
| `PORT` | `3000` | Porta da API |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | Endereço do Postgres (no compose vira `db`) |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | `postgres` / `postgres` / `oficina` | Credenciais do banco |
| `JWT_SECRET` | — | Segredo do access token |
| `JWT_ACCESS_EXPIRES` | `10m` | Expiração do access token |
| `JWT_REFRESH_SECRET` | — | Segredo do fluxo de refresh |
| `JWT_REFRESH_EXPIRES` | `7d` | Expiração do refresh token |
| `BCRYPT_SALT_ROUNDS` | `10` | Custo do hash de senha |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `admin@oficina.com` / `Admin@123` | Admin criado pelo seed |
| `SONAR_PORT` | `9000` | Porta do SonarQube |

## Primeiro acesso à API

Login com o admin do seed:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@oficina.com","password":"Admin@123"}'
```

Use o `accessToken` retornado nas rotas protegidas:

```bash
curl http://localhost:3000/auth/me -H 'Authorization: Bearer <accessToken>'
```

O restante do fluxo (refresh, logout) e a tabela de endpoints estão no
[README](../README.md).

## Migrations

Os arquivos ficam em `src/database/migrations/` e seguem o padrão do TypeORM:
`<timestamp-epoch-ms>-<Nome>.ts`, com a classe nomeada `<Nome><timestamp>`. O
timestamp é o instante real de criação (é ele que define a ordem de execução),
nunca um número sequencial. Use `npm run migration:generate -- src/database/migrations/<Nome>`,
que já gera o timestamp correto.

```bash
npm run migration:run      # aplica as pendentes
npm run migration:revert   # desfaz a última
```

## Lint e formatação

```bash
npm run lint      # ESLint — só verifica, não altera arquivo
npm run lint:fix  # ESLint corrigindo o que for automatizável
npm run format    # Prettier
```

O `npm run lint` é o que entra no checklist antes de encerrar uma tarefa: ele
sai com código diferente de zero se houver qualquer erro. O `lint:fix` e o
`format` é que alteram arquivo.

A configuração está em `eslint.config.mjs` (flat config do ESLint 10) e usa
regras que dependem do type checker, então o lint carrega o `tsconfig.json` —
por isso demora alguns segundos a mais que um linter puramente sintático.

## Testes

```bash
npm test          # unitários
npm run test:cov  # unitários + cobertura (gera coverage/lcov.info)
npm run test:e2e  # integração — precisa do Postgres no ar
```

Para o e2e, suba só o banco antes:
`docker compose -f local/docker-compose.yml up -d db`.

Os scripts já limitam o paralelismo do Jest (`--maxWorkers=4`, e `1` no e2e,
porque as suítes de integração compartilham o mesmo banco) para não saturar a
máquina — detalhes em [analise-sonarqube.md](analise-sonarqube.md).

## Limites de recursos da stack

Cada serviço tem teto de CPU e memória definido no `local/docker-compose.yml`:

| Serviço | CPU | Memória |
| ------- | --- | ------- |
| `sonarqube` | 2.0 | 3g |
| `seed` | 1.0 | 1g |
| `app` | 1.0 | 512m |
| `db` | 0.5 | 512m |
| `sonarqube-db` | 0.5 | 512m |

O `seed` tem o teto mais alto que o `app` porque roda sob `ts-node`, que
type-checka o projeto em memória — o `app` roda o `dist/` já compilado.

Conferir o que está sendo consumido de fato:

```bash
docker stats --no-stream
```

## Problemas comuns

**Porta 5432 ou 3000 já em uso** — outro container antigo pode estar segurando a
porta. Liste com `docker ps -a` e pare o conflitante, ou mude `DB_PORT`/`PORT`
no `local/.env`.

**`oficina-api` reiniciando em loop** — quase sempre é falha de conexão com o
banco ou migration quebrada. Veja `docker logs oficina-api`. O compose já espera
o `db` ficar `healthy` e o `seed` terminar antes de subir a API.

**A API não sobe e o compose para no `seed`** — o seed falhou. Veja
`docker logs oficina-seed`; como a API depende dele
(`service_completed_successfully`), um erro ali bloqueia a subida.

**Container morre com exit code 137** — foi morto por falta de memória (OOM).
Aumente o `mem_limit` do serviço no `local/docker-compose.yml` e recrie com
`docker compose -f local/docker-compose.yml up -d`.

**Alterou o `docker-compose.yml` e nada mudou** — `up -d` só recria o que teve a
definição alterada; se precisar forçar, use `--force-recreate`.

**Build lento ou pesado** — o `local/Dockerfile.dockerignore` mantém
`node_modules` fora do contexto de build. Não o remova.
