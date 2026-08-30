# Catálogo de serviços, peças e insumos

Este documento descreve o catálogo entregue sobre o cadastro de clientes e
veículos: o CRUD de serviços (`/services`), o CRUD de peças (`/parts`) e o CRUD
de insumos (`/supplies`), todos restritos ao papel `admin`.

São os três recursos que a Ordem de Serviço consome: o serviço define o que a
oficina executa e quanto cobra; a peça e o insumo definem o que é aplicado no
veículo e quanto há em estoque.

## De onde vêm as regras

O Event Storming do projeto tem um frame dedicado a **Peças e Insumos**, no qual
`Peças` e `Insumo` aparecem como **agregados distintos** — cada um com o ciclo
completo de validação, reserva, consumo e devolução — e o ator **Admin** é quem
cadastra e abastece. Daí a escolha por dois módulos separados em vez de uma
tabela única de itens.

| Elemento do board | O que virou no código |
| ----------------- | --------------------- |
| Read model "Lista os serviços disponíveis" | `GET /services` |
| Read model "Lista as peças disponíveis e quantidade no estoque" | `GET /parts` |
| Read model "Lista os insumos disponíveis e quantidade no estoque" | `GET /supplies` |
| Read model "Consulta o estoque da peça" / "do insumo" | `GET /parts/:id` e `GET /supplies/:id` |
| Comando "Valida se existe a peça" / "o insumo" | `GET /parts/code/:code` e `GET /supplies/code/:code` |
| Comando "Adiciona a nova peça" / "o novo insumo" | `POST /parts` e `POST /supplies` |
| Comando "Adiciona quantidade ao estoque da peça" / "do insumo" | `PATCH /parts/:id` e `PATCH /supplies/:id` com `stockQuantity` |
| Comandos "Reserva", "Consome" e "Devolve" | nascem de eventos da OS — veja [ordens-de-servico.md](ordens-de-servico.md) |

O enunciado do Tech Challenge exige, na gestão administrativa, o "CRUD de
serviços" e o "CRUD de peças e insumos, com controle de estoque".

## Quais dados compõem cada recurso

O board deixa a pergunta **"Quais dados?"** em aberto sobre "Adicionou uma nova
peça" e "Adicionou um novo insumo". A resposta adotada é esta.

### Serviço — tabela `services`

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `name` | `varchar(120)`, único | obrigatório |
| `description` | `varchar(255)` | opcional |
| `price` | `numeric(10,2)` | obrigatório, `>= 0` |
| `estimatedMinutes` | `integer` | obrigatório, `>= 1` |
| `isActive` | `boolean` | inicia em `true` |

`estimatedMinutes` é o tempo previsto de execução. Ele existe desde já porque o
enunciado pede o "monitoramento do tempo médio de execução dos serviços": é
contra esse valor que o tempo real medido na OS será comparado.

### Peça — tabela `parts`

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `code` | `varchar(30)`, único | obrigatório, normalizado |
| `name` | `varchar(120)` | obrigatório |
| `description` | `varchar(255)` | opcional |
| `brand` | `varchar(60)` | opcional |
| `unitPrice` | `numeric(10,2)` | obrigatório, `>= 0` |
| `stockQuantity` | `integer` | `>= 0`, padrão `0` |
| `reservedQuantity` | `integer` | padrão `0`, mantido pela Ordem de Serviço |
| `minimumStock` | `integer` | `>= 0`, padrão `0` |
| `isActive` | `boolean` | inicia em `true` |

### Insumo — tabela `supplies`

Mesma estrutura da peça, trocando `brand` por `unit`:

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `unit` | enum `un`, `l`, `ml`, `kg`, `g` | obrigatório |

A unidade de medida distingue o insumo da peça: peça se conta por unidade, e
insumo é consumido por volume ou massa (litro de óleo, grama de graxa).

## Normalização do código

O código identifica a peça ou o insumo para quem opera a oficina, e é por ele
que a etapa da OS fará a busca. Para que a comparação e a restrição de
unicidade não dependam de como o texto foi digitado, ele é gravado sem espaços
e em maiúsculas por `normalizeCode` (`src/common/utils/code.util.ts`), do mesmo
modo que a placa do veículo:

| Entrada aceita | Gravado em banco |
| -------------- | ---------------- |
| `flt oil-001` | `FLTOIL-001` |
| `  oleo-5w30  ` | `OLEO-5W30` |

`GET /parts/code/:code` e `GET /supplies/code/:code` normalizam o parâmetro
antes de consultar, então qualquer formatação funciona na URL.

## Preço em `numeric`

`price` e `unitPrice` são `numeric(10,2)` no Postgres — a escolha correta para
dinheiro, que não pode sofrer o arredondamento binário de um `float`. O driver
do Postgres devolve esse tipo como **string**, então as colunas usam o
`moneyTransformer` (`src/common/utils/money.transformer.ts`), que converte o
valor para número na leitura. Na API o preço trafega sempre como número:
`"unitPrice": 49.9`, nunca `"49.90"`.

## Controle de estoque

`stockQuantity` e `minimumStock` são campos de cadastro: entram no `POST` e são
alterados pelo `PATCH`. É assim que o administrador abastece o estoque, o que
cobre o comando "Adiciona quantidade ao estoque" do board.

A movimentação — reserva, consumo e devolução — **não** acontece por aqui. No
Event Storming os três nascem de eventos da Ordem de Serviço ("Reservou as peças
no estoque", "Peças consumidas do estoque", "Peças retornam ao estoque") e
dependem de uma OS existente para saber quanto reservar e para quem. Estão
implementados na etapa da OS e descritos em
[ordens-de-servico.md](ordens-de-servico.md).

O que a OS trouxe para estas duas tabelas foi a coluna `reserved_quantity`: a
quantidade já prometida a ordens aguardando aprovação. Ela continua no estoque
físico, mas não pode ser prometida a outra ordem, então o `GET /parts` e o
`GET /supplies` expõem os três números:

| Campo | Significado |
| ----- | ----------- |
| `stockQuantity` | o que existe fisicamente na prateleira |
| `reservedQuantity` | o que já está reservado para ordens em aberto |
| `availableQuantity` | `stockQuantity - reservedQuantity`, o que pode ser prometido |

Um `PATCH` com `stockQuantity` sobrescreve o estoque físico e não mexe nas
reservas — é a operação de abastecimento, não de movimentação.

`minimumStock` ainda não dispara nada. Ele registra a quantidade mínima desejada
e serve de base para o alerta de estoque baixo (o ponto de atenção "Alerta?" do
board), que segue como evolução.

## Exclusão é inativação

Como no cadastro de clientes e veículos, nada é apagado. `DELETE /services/:id`,
`DELETE /parts/:id` e `DELETE /supplies/:id` respondem **204** e apenas marcam
`is_active = false`, preservando o histórico dos itens que já apareceram em
alguma ordem de serviço.

Consequências:

- as listagens trazem **apenas os ativos**; use `?includeInactive=true` para ver
  todos;
- `GET /:id` devolve o registro mesmo inativo, para que o administrador possa
  reativá-lo;
- reativar é um `PATCH` com `{ "isActive": true }`.

## Erros esperados

| Situação | Status | Mensagem |
| -------- | ------ | -------- |
| Preço negativo, tempo estimado menor que 1, quantidade negativa | 400 | mensagem do `ValidationPipe` |
| Unidade de medida fora do enum | 400 | mensagem do `ValidationPipe` |
| Campo fora do DTO | 400 | mensagem do `ValidationPipe` |
| Nome de serviço já cadastrado | 409 | `Já existe um serviço com este nome.` |
| Código de peça já cadastrado | 409 | `Já existe uma peça com este código.` |
| Código de insumo já cadastrado | 409 | `Já existe um insumo com este código.` |
| Serviço inexistente | 404 | `Serviço não encontrado.` |
| Peça inexistente | 404 | `Peça não encontrada.` |
| Insumo inexistente | 404 | `Insumo não encontrado.` |
| Sem token | 401 | — |
| Token de mecânico | 403 | — |

## Testes

- Unitários: `src/common/utils/code.util.spec.ts`,
  `src/common/utils/money.transformer.spec.ts` e os specs de service e
  controller dos três módulos.
- Integração: `src/test/catalogo.e2e-spec.ts` percorre os três CRUDs
  (criação com código normalizado → busca por código → atualização de estoque →
  inativação → listagem com e sem inativos) e confere os bloqueios 401 e 403.

Os testes e2e usam o mesmo banco da aplicação e truncam `services`, `parts` e
`supplies`, por isso o script `test:e2e` roda com `--maxWorkers=1`.
