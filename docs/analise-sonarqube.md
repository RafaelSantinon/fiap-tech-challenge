# Análise de código com SonarQube

Passo a passo para rodar a análise estática do projeto em um SonarQube local,
já com limites de recursos aplicados para não travar a máquina.
Para subir a aplicação, veja [como-executar.md](como-executar.md).

## Como funciona

São duas peças distintas:

1. **O servidor SonarQube** (`oficina-sonarqube` + `oficina-sonar-db`), que sobe
   junto com a stack e guarda o histórico das análises. Internamente ele roda
   três processos JVM: *web*, *compute engine* e *busca* (Elasticsearch).
2. **O scanner** (`sonarsource/sonar-scanner-cli`), um container efêmero que
   você roda sob demanda: ele lê o código, o `coverage/lcov.info` e envia o
   resultado para o servidor.

A configuração do projeto fica em **`local/sonar-project.properties`**.

## Passo 1 — Subir a stack

```bash
cd <raiz-do-projeto>
docker compose -f local/docker-compose.yml up -d
```

O SonarQube leva de 1 a 2 minutos para iniciar. Espere até o status virar `UP`:

```bash
curl -s http://localhost:9000/api/system/status
# {"id":"...","version":"...","status":"UP"}
```

Enquanto estiver `STARTING`, a interface responde com uma página de espera.

## Passo 2 — Login

Abra <http://localhost:9000>.

- **Volume novo (primeira subida):** login `admin` / `admin`. O SonarQube obriga
  a trocar a senha nesse primeiro acesso.
- **Volume já existente:** use a senha que você definiu. Se `admin`/`admin` não
  funcionar, é porque a troca já foi feita.

Esqueceu a senha? A saída mais simples num ambiente local é recriar o banco do
Sonar — mas isso apaga todo o histórico de análises:

```bash
docker compose -f local/docker-compose.yml down
docker volume rm local_sonar_db_data local_sonarqube_data
docker compose -f local/docker-compose.yml up -d
```

## Passo 3 — Gerar um token de análise

O scanner autentica por token, não por senha.

**Pela interface:** *My Account → Security* (<http://localhost:9000/account/security>)
→ em *Generate Tokens*, dê um nome, escolha o tipo **Global Analysis Token** e
clique em **Generate**. Copie o valor — ele só aparece uma vez.

**Pela API:**

```bash
curl -s -u admin:<SUA_SENHA> -X POST \
  "http://localhost:9000/api/user_tokens/generate?name=cli&type=GLOBAL_ANALYSIS_TOKEN"
```

Guarde o token fora do repositório. Uma opção prática é exportá-lo na sessão:

```bash
export SONAR_TOKEN=<seu-token>
```

## Passo 4 — Gerar o relatório de cobertura

O SonarQube não executa testes: ele lê o arquivo `coverage/lcov.info` que o Jest
produz. Sem esse passo, a métrica de cobertura aparece zerada.

```bash
npm run test:cov
```

O caminho do relatório está declarado no `local/sonar-project.properties`
(`sonar.javascript.lcov.reportPaths=coverage/lcov.info`).

## Passo 5 — Rodar o scanner

Sempre a partir da **raiz do projeto** — o `baseDir` do scanner é o diretório
montado, e é dele que `sonar.sources=src` e o caminho da cobertura são resolvidos.

```bash
docker run --rm --network host \
  --cpus 2 --memory 2g \
  -e SONAR_SCANNER_JAVA_OPTS="-Xmx1g" \
  -v "$(pwd):/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.settings=local/sonar-project.properties \
  -Dsonar.token=$SONAR_TOKEN
```

O que cada parte faz:

| Trecho | Motivo |
| ------ | ------ |
| `--network host` | deixa o container enxergar o servidor em `localhost:9000` |
| `--cpus 2 --memory 2g` | teto de recursos do scanner |
| `SONAR_SCANNER_JAVA_OPTS=-Xmx1g` | teto de heap da JVM do scanner |
| `-v "$(pwd):/usr/src"` | monta o projeto no diretório de trabalho do scanner |
| `-Dproject.settings=...` | aponta o `.properties`, que vive em `local/` |

Ao final o scanner imprime `EXECUTION SUCCESS` e a URL do dashboard. O
processamento no servidor (compute engine) leva mais alguns segundos.

## Passo 6 — Ver a análise

<http://localhost:9000/dashboard?id=fiap-tech-challenge>

O painel mostra bugs, vulnerabilidades, *code smells*, duplicação, cobertura e o
resultado do **Quality Gate**. Também dá para consultar pela API:

```bash
curl -s -u $SONAR_TOKEN: \
  "http://localhost:9000/api/qualitygates/project_status?projectKey=fiap-tech-challenge"
```

## Limites de recursos

A análise é o momento mais pesado do ambiente: o servidor roda três JVMs
(incluindo Elasticsearch), o scanner sobe outra JVM e o `npm run test:cov` abre
vários workers do Jest. Sem teto, isso consome a máquina inteira e pode travá-la.
Os limites abaixo já estão aplicados no repositório:

| Onde | Limite | Arquivo |
| ---- | ------ | ------- |
| `sonarqube` | `cpus: 2.0`, `mem_limit: 3g` | `local/docker-compose.yml` |
| heap interno do Sonar | 512m para web, compute engine e busca | `local/docker-compose.yml` (`SONAR_*_JAVAOPTS`) |
| `sonarqube-db` e `db` | `cpus: 0.5`, `mem_limit: 512m` | `local/docker-compose.yml` |
| `app` | `cpus: 1.0`, `mem_limit: 512m` | `local/docker-compose.yml` |
| scanner | `--cpus 2 --memory 2g`, heap 1g | comando `docker run` |
| cobertura | `--maxWorkers=4 --workerIdleMemoryLimit=512MB` | `package.json` (`test:cov`) |

O teto total da stack fica em torno de **4,5 GB**, mais até 2 GB durante a
execução do scanner.

**Máquina mais apertada?** Reduza para:

- scanner: `--cpus 1 --memory 1g` e `SONAR_SCANNER_JAVA_OPTS="-Xmx512m"`;
- Jest: `npm run test:cov -- --maxWorkers=2`;
- SonarQube: `mem_limit: 2g` e heaps de 256m no web e no compute engine (o heap
  da busca precisa de `-Xms` igual ao `-Xmx`, não deixe abaixo de 512m).

Se não for analisar naquele momento, simplesmente não suba o Sonar:

```bash
docker compose -f local/docker-compose.yml up -d db app
```

Acompanhe o consumo real durante a análise em outro terminal:

```bash
docker stats
```

## O que é analisado

Definido em `local/sonar-project.properties`:

| Chave | Valor |
| ----- | ----- |
| `sonar.projectKey` | `fiap-tech-challenge` |
| `sonar.sources` | `src` |
| `sonar.tests` | `src` (arquivos `*.spec.ts` e `*.e2e-spec.ts`) |
| `sonar.exclusions` | specs, DTOs, entities e migrations |
| `sonar.javascript.lcov.reportPaths` | `coverage/lcov.info` |

DTOs, entities e migrations ficam de fora por serem majoritariamente declarativos
— manter esses arquivos infla a contagem de linhas e distorce a cobertura.

## Problemas comuns

**`Fail to request http://localhost:9000`** — o servidor ainda não subiu, ou o
`--network host` foi esquecido. Confirme com o `api/system/status` antes.

**`Not authorized` / HTTP 401** — token inválido, expirado ou revogado. Gere
outro em *My Account → Security*.

**Cobertura em 0%** — o `coverage/lcov.info` não existe (rode `npm run test:cov`)
ou o scanner foi executado de um diretório diferente da raiz do projeto.

**Container do Sonar com exit 137, ou o dashboard cai durante a análise** — OOM.
Suba o `mem_limit` do serviço `sonarqube` e recrie com
`docker compose -f local/docker-compose.yml up -d`.

**Elasticsearch não inicia (`max virtual memory areas ... too low`)** — o valor
de `vm.max_map_count` do kernel está baixo. Ajuste com
`sudo sysctl -w vm.max_map_count=262144` (para tornar permanente, adicione em
`/etc/sysctl.conf`).

**Sobrou lixo de análise no diretório** — o scanner cria `.scannerwork/`, que já
está no `.gitignore` e pode ser apagado à vontade.
