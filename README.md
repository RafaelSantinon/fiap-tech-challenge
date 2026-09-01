# FIAP - tech challenge - Sistema Integrado de Atendimento e Execução de Serviços para Oficina Mecânica

Back-end do **Sistema Integrado de Atendimento e Execução de Serviços** de uma
oficina mecânica — Tech Challenge da FIAP. A API cobre o ciclo
completo do atendimento: identificação do cliente e do veículo, catálogo de
serviços, peças e insumos, abertura da ordem de serviço, diagnóstico, orçamento
gerado automaticamente, aprovação pelo cliente, execução e entrega — com
controle de estoque e métricas de tempo por status.

São **13 módulos** e **62 rotas**, documentadas no Swagger em
<http://localhost:3000/docs> assim que a aplicação sobe.

## Stack e por que cada escolha

**NestJS 11** — o domínio é grande e se divide naturalmente em módulos com
dependências claras (o catálogo não conhece a ordem de serviço; o workflow
conhece os dois). O Nest dá módulos, injeção de dependência, `ValidationPipe`
global e guards de autorização prontos, então a energia foi para a regra de
negócio, não para a infraestrutura.

**PostgreSQL 16** — os dados são fortemente relacionais e transacionais. Além
disso, quatro recursos do Postgres são usados de fato: `numeric(10,2)` para
dinheiro (sem o arredondamento binário do `float`), `jsonb` para acumular o tempo
por status, uma *sequence* para gerar o número da ordem sem colisão, e lock
pessimista (`SELECT ... FOR UPDATE`) para que duas ordens não reservem a mesma
última peça.

**TypeORM** — migrations versionadas com `synchronize: false` (o schema nunca
muda sozinho), entities tipadas junto do módulo que as usa e transação explícita
via `EntityManager` onde o estoque é movimentado. Integra direto no Nest com
`@nestjs/typeorm`.

**JWT + Passport** — autenticação sem estado de sessão, com access token curto
(10 min) e refresh token com rotação e revogação no banco.

**Jest + Supertest** — a mesma ferramenta cobre o unitário e o e2e contra o
Postgres real, e o `coverage/lcov.info` que o SonarQube consome sai do mesmo
comando de teste.

**Docker Compose** — banco, seed, API e SonarQube sobem com um comando, cada
serviço com teto de CPU e memória declarado em `local/docker-compose.yml`.

**SonarQube** — o Quality Gate exigido pelo enunciado rodando localmente, sobre a
cobertura gerada pelo Jest.

## Como iniciar com Docker

Pré-requisitos: Docker 24+ com o plugin `docker compose` v2.

```bash
cp local/.env.example local/.env
docker compose -f local/docker-compose.yml up -d --build
```

Sobem cinco containers:

| Container | Serviço | Porta |
| --------- | ------- | ----- |
| `mechanic-workshop-api` | API NestJS | 3000 |
| `mechanic-workshop-db` | PostgreSQL 16 (aplicação) | 5432 |
| `mechanic-workshop-seed` | migrations, admin e dados de demonstração (roda uma vez e encerra) | — |
| `mechanic-workshop-sonarqube` | SonarQube Community | 9000 |
| `mechanic-workshop-sonar-db` | PostgreSQL 16 (SonarQube) | interna |

O `seed` aplica as migrations, cria o administrador e popula o banco com dados de
demonstração — 12 clientes, 20 veículos, catálogo completo e 44 ordens de serviço
nos seis status, com orçamentos e métricas já respondendo. A API só sobe depois
que ele termina com sucesso, e ele é idempotente: repetir o `up` não duplica
nada. O que é criado está em [docs/domain.md](docs/domain.md#dados-de-demonstração).

Se o banco aparecer vazio depois de um `up` bem-sucedido, o motivo mais provável
é ter rodado o e2e no meio: as suítes truncam as tabelas do banco local (veja
[Testes](#testes)). Para repopular sem derrubar nada:

```bash
docker compose -f local/docker-compose.yml run --rm seed
```

Depois de subir:

- API — <http://localhost:3000>
- Swagger — <http://localhost:3000/docs>
- Health check — <http://localhost:3000/health>
- SonarQube — <http://localhost:9000> (primeiro acesso `admin` / `admin`)

O admin da API é `admin@oficina.com` / `Admin@123`, e os mecânicos de
demonstração entram com `Mecanico@123`. O roteiro para demonstrar a API pelo
Swagger, com os bodies de cada requisição, está em
[docs/api-examples.md](docs/api-examples.md).

Para parar:

```bash
docker compose -f local/docker-compose.yml down
```

> Evite `down -v`: além do banco da aplicação, isso apaga os volumes do
> SonarQube, junto com o histórico de análises e a senha do admin dele.

As migrations ficam em `src/database/migrations/` e são aplicadas com
`npm run migration:run` (`migration:revert` desfaz a última). Para criar uma
nova, `npm run migration:generate -- src/database/migrations/<Nome>`.

## Testes

```bash
npm test                    # unitários
npm run test:cov            # unitários + cobertura (gera coverage/lcov.info)
npm run test:e2e            # integração — precisa do Postgres no ar
npm run test:e2e -- parts   # integração de um módulo só
```

Para o e2e, suba só o banco antes:
`docker compose -f local/docker-compose.yml up -d db`.

Os unitários ficam ao lado do arquivo que testam (`*.spec.ts`) e a cobertura dos
domínios entregues está em **100%**. Os de integração ficam em `src/test/`, um
arquivo por módulo, e exercitam as 62 rotas contra o Postgres real — inclusive um
caso de concorrência que prova o lock da reserva de estoque.

O e2e roda com `--maxWorkers=1` porque as suítes compartilham o mesmo banco e
truncam as tabelas entre si. Elas leem `local/.env`, que aponta para
`localhost:5432` — o mesmo Postgres que o compose publica. Por isso **rodar o
e2e apaga os dados de demonstração e o admin**, inclusive quando a stack inteira
está no ar: o `truncate` entre as suítes limpa as 12 tabelas de domínio, `users`
incluída.

Para repopular o banco depois do e2e:

```bash
docker compose -f local/docker-compose.yml run --rm seed   # com a stack no ar
npm run seed && npm run seed:demo -- --reset               # sem Docker, com o banco no ar
```

Qualidade estática também é verificada com ESLint (incluindo regras que dependem
do type checker, como `no-floating-promises`) e Prettier:

```bash
npm run lint      # só verifica
npm run lint:fix  # corrige o automatizável
npm run format    # prettier
```

## Análise com SonarQube

O servidor sobe junto com a stack; o scanner é um container efêmero que você roda
sob demanda. A configuração do projeto está em `local/sonar-project.properties`.

**1. Aguarde o servidor ficar disponível** (leva 1 a 2 minutos):

```bash
curl -s http://localhost:9000/api/system/status
```

**2. Gere um token de análise** em <http://localhost:9000> →
*My Account → Security* → *Generate Tokens*, tipo **Global Analysis Token**:

```bash
export SONAR_TOKEN=<seu-token>
```

**3. Gere o relatório de cobertura** — o Sonar não executa testes, ele lê o
`coverage/lcov.info`:

```bash
npm run test:cov
```

**4. Rode o scanner a partir da raiz do projeto:**

```bash
docker run --rm --network host \
  --cpus 2 --memory 2g \
  -e SONAR_SCANNER_JAVA_OPTS="-Xmx1g" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=local/sonar-project.properties \
  -Dsonar.token=$SONAR_TOKEN \
  -Dsonar.qualitygate.wait=true
```

Com `-Dsonar.qualitygate.wait=true` o scanner espera o processamento, imprime
`QUALITY GATE STATUS: PASSED` ou `FAILED` e sai com código 1 se reprovar. O
resultado fica em
<http://localhost:9000/dashboard?id=fiap-tech-challenge>.

O Quality Gate avalia três condições, todas sobre código novo:

| Condição | Limite |
| -------- | ------ |
| `new_coverage` | ≥ 80% |
| `new_duplicated_lines_density` | ≤ 3% |
| `new_violations` | = 0 |

`new_violations` é a mais sensível: uma única issue nova reprova o gate.

Se algo der errado: **cobertura em 0%** significa `lcov.info` ausente ou scanner
rodado fora da raiz; **HTTP 401** é token inválido ou revogado; **exit 137** no
container do Sonar é falta de memória — suba o `mem_limit` do serviço em
`local/docker-compose.yml`.

## Documentação

- [docs/domain.md](docs/domain.md) — organização dos módulos, regras de
  cadastro, catálogo, ordem de serviço e estoque, máquina de status, métricas e
  os dados de demonstração.
- [docs/api-examples.md](docs/api-examples.md) — roteiro pelo Swagger, com os
  dois fluxos completos: a ordem de serviço do cadastro à entrega e a gestão de
  peças e insumos, da reserva à devolução ao estoque.
