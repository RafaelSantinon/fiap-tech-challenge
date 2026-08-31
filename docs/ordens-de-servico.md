# Ordens de serviço e orçamento

Este documento descreve a Ordem de Serviço entregue sobre o cadastro e o
catálogo: o CRUD de ordens (`/service-orders`), a inclusão de serviços, peças e
insumos, o orçamento gerado automaticamente, as APIs públicas que o cliente usa
para acompanhar e responder, e as métricas de tempo por status.

É a peça que amarra tudo o que veio antes. O cliente e o veículo vêm do
cadastro; os serviços, as peças e os insumos vêm do catálogo; a OS é o agregado
que junta os três, calcula o preço e caminha pelos status até a entrega.

As rotas administrativas (`/service-orders` e `/quotes`) são abertas aos papéis
`admin` e `mechanic` — o mecânico é quem monta a ordem no dia a dia. As duas
métricas em `/metrics` são restritas ao `admin`. As rotas de
`/public/service-orders` **não têm autenticação**: são o canal do cliente.

## Como o código está organizado

A etapa é entregue em cinco módulos, não em um. A divisão separa **o que
persiste** do **que decide**: quem guarda estado não conhece as políticas, e as
políticas ficam todas num lugar só.

| Módulo | Responsabilidade | Conhece |
| ------ | ---------------- | ------- |
| `stock` | reserva, consome e devolve estoque a partir de listas de `{ id, quantity }` | `parts`, `supplies` |
| `quotes` | o orçamento: totais, status e consulta | ninguém |
| `notifications` | envia o orçamento ao cliente | ninguém |
| `service-orders` | a OS: entidades, máquina de status, CRUD e os itens | cadastro, catálogo, `stock` |
| `service-order-workflow` | as políticas do board: quando gerar o orçamento, o que acontece ao aprovar e ao recusar | todos os acima |
| `service-order-metrics` | read model dos tempos | ninguém |

O grafo de dependências é uma **árvore** — não há `forwardRef` nem import
circular em lugar nenhum:

```
parts, supplies ──> stock ──┐
                            │
customers, vehicles ────────┤
services, parts, supplies ──┼──> service-orders ──┐
                            │                     │
                            └─────────────────────┤
quotes ───────────────────────────────────────────┤
notifications ────────────────────────────────────┤
                                                  v
                                       service-order-workflow

service-order-metrics  (isolado: só o DataSource)
```

O que sustenta a árvore é o **gatilho do orçamento estar uma camada acima**.
`ServiceOrderItemsService` (em `service-orders`) só grava o item; quem decide se
aquele item fechou os três grupos e dispara o orçamento é o
`ServiceOrderWorkflowService`. Se o gatilho morasse junto com os itens,
`service-orders` precisaria de `quotes` e `quotes` precisaria de
`service-orders` — o ciclo que essa organização evita.

`QuotesService` é o exemplo mais claro da separação: ele recebe totais já
somados e não sabe o que é uma Ordem de Serviço. Quem soma, reserva o estoque,
muda o status e dispara o e-mail é o `workflow`.

O Swagger em `/docs` reflete a mesma divisão, com um grupo por audiência:

| Grupo | Rotas | Quem usa |
| ----- | ----- | -------- |
| `service-orders` | abertura, consulta, inativação e avanço manual de status | admin e mecânico |
| `service-order-items` | inclusão, alteração e remoção de serviços, peças e insumos | admin e mecânico |
| `quotes` | consulta dos orçamentos gerados | admin e mecânico |
| `public` | acompanhamento e resposta ao orçamento | o cliente, sem token |
| `metrics` | tempo médio por status e por serviço | só admin |

O `workflow` é o único módulo que aparece em dois grupos — `service-order-items`
e `public` —, porque as duas pontas atendem audiências diferentes: a equipe que
monta a ordem e o cliente que responde. Agrupá-las juntas no Swagger só porque
compartilham o módulo tornaria a página menos legível, não mais.

## De onde vêm as regras

O Event Storming tem dois frames que descrevem esta etapa. O primeiro percorre o
ciclo da OS, do "Cliente solicitou um orçamento" até "OS entregue"; o segundo
detalha o que acontece com o estoque de peças e insumos ao longo desse ciclo.

| Elemento do board | O que virou no código |
| ----------------- | --------------------- |
| Comando "Identifica o cliente" / "Identifica o veículo" | `POST /service-orders` com `customerId` e `vehicleId` |
| Evento "OS recebida" | status `received` na criação |
| Comando "Inicia a analise" → "OS em diagnóstico" | `PATCH /service-orders/:id/status` para `in_diagnosis` |
| Comandos "Incluí os serviços" / "as peças" / "os insumos" | `POST /service-orders/:id/services`, `/parts` e `/supplies` |
| Comando "Valida se tinha estoque das peças" / "do insumo" | validação de estoque livre na inclusão do item |
| Evento "Reservou as peças no estoque" / "Reservou o insumo no estoque" | reserva feita ao gerar o orçamento |
| Evento "Orçamento gerado" | tabela `quotes`, criada automaticamente |
| Evento "Orçamento enviado para aprovação do cliente" | log do `NotificationsService` |
| Comando "Aprova o orçamento" (ator Cliente) | `POST /public/service-orders/:number/quote/approve` |
| Comando "recusa o orçamento" (ator Cliente) | `POST /public/service-orders/:number/quote/reject` |
| Evento "Peças consumidas do estoque" / "Insumo consumido do estoque" | baixa de estoque na aprovação |
| Evento "Peças retornam ao estoque" / "Insumo retorna ao estoque" | devolução da reserva na recusa |
| Comando "inicia o serviço" → "Equipe realizou o serviço" | status `in_progress` e `finished` |
| Comando "Retira o carro" → "OS entregue" | status `delivered` |
| Ponto de atenção "Como o cliente envia a resposta?" | as duas rotas públicas de aprovação e recusa |
| Ponto de atenção "Enviado por onde?" | e-mail, simulado por log nesta entrega |
| Ponto de atenção "Automático após x tempo?" | não implementado; toda transição parte de uma ação |
| Ponto de atenção "Alerta?" (`minimumStock`) | não implementado, segue como evolução |

O enunciado do Tech Challenge exige, nos fluxos principais, o "orçamento gerado
automaticamente com base nos serviços e peças", o "envio do orçamento ao cliente
para aprovação", a "alteração automática dos status conforme ações no sistema",
a consulta do cliente "via API para acompanhar o progresso" e, na gestão
administrativa, a "listagem e detalhamento de ordens de serviço" e o
"monitoramento do tempo médio de execução dos serviços".

## Quais dados compõem cada recurso

### Ordem de serviço — tabela `service_orders`

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `number` | `varchar(20)`, único | gerado pelo banco como `OS-000001`; é o identificador que o cliente usa |
| `customerId` | `uuid` | cliente ativo; a exclusão do cliente é `RESTRICT` |
| `vehicleId` | `uuid` | veículo ativo e do mesmo cliente |
| `status` | enum | um dos seis status do enunciado |
| `description` | `varchar(255)` | relato do cliente ou diagnóstico da equipe |
| `statusDurations` | `jsonb` | segundos acumulados em cada status já concluído |
| `statusChangedAt` | `timestamp` | quando o status atual começou |
| `isActive` | `boolean` | inativação lógica, como nos demais módulos |

O número é gerado por uma sequence do Postgres (`service_orders_number_seq`)
usada como `DEFAULT` da coluna, e não pela aplicação: assim duas ordens abertas
ao mesmo tempo nunca recebem o mesmo número.

### Itens — tabelas `service_order_services`, `service_order_parts` e `service_order_supplies`

As três têm a mesma forma: a ordem, o item do catálogo, a `quantity`, o
`unitPrice` e o `totalPrice`.

O `unitPrice` é uma **cópia do preço do catálogo no momento da inclusão**, não
uma leitura viva. Se o administrador reajustar o preço de uma peça depois, o
orçamento já enviado ao cliente continua valendo pelo valor que ele recebeu.

Uma restrição de unicidade `(service_order_id, <item>_id)` impede o mesmo item
duas vezes na mesma ordem — para mudar a quantidade usa-se o `PATCH` do item.

### Orçamento — tabela `quotes`

| Campo | Tipo | Regra |
| ----- | ---- | ----- |
| `serviceOrderId` | `uuid`, único | uma ordem tem no máximo um orçamento |
| `status` | enum | `pending`, `approved` ou `rejected` |
| `servicesTotal`, `partsTotal`, `suppliesTotal` | `numeric(10,2)` | soma dos itens de cada grupo |
| `totalAmount` | `numeric(10,2)` | soma dos três |
| `sentAt` | `timestamp` | quando o orçamento foi gerado e enviado |
| `respondedAt` | `timestamp` | quando o cliente respondeu; nulo enquanto pendente |

Como no catálogo, os valores são `numeric` no banco e chegam à aplicação como
número graças ao `moneyTransformer` (`src/common/utils/money.transformer.ts`).

## Máquina de status

```
received ──PATCH status──> in_diagnosis
                                 │
              [automático] os três grupos preenchidos
                                 ▼
                        awaiting_approval
                         │               │
        [automático] cliente aprova   [automático] cliente recusa
                         ▼               ▼
                   in_progress        finished
                         │
                  PATCH status
                         ▼
                     finished ──PATCH status──> delivered
```

Três transições são **automáticas** e nascem de um evento do sistema:

1. a geração do orçamento leva a ordem para `awaiting_approval`;
2. a aprovação do cliente leva para `in_progress` e marca o orçamento como
   `approved`;
3. a recusa do cliente leva para `finished` e marca o orçamento como `rejected`.

As três são recusadas com **400** se alguém tentar aplicá-las pelo
`PATCH /service-orders/:id/status`. Esse endpoint só aceita as transições que
dependem de uma ação da equipe: `received → in_diagnosis`,
`in_progress → finished` e `finished → delivered`. Qualquer outro par também é
**400** — não existe pular etapa nem voltar atrás.

O board pergunta, em três pontos, "Automático após x tempo?". A resposta desta
entrega é não: nenhuma transição acontece por decurso de prazo. Toda mudança de
status tem uma ação identificável por trás, o que mantém a linha do tempo da
ordem auditável.

## Orçamento automático

O orçamento nasce sozinho, sem endpoint de geração. A cada inclusão de item a
ordem é reavaliada: quando ela passa a ter **pelo menos um serviço, pelo menos
uma peça e pelo menos um insumo**, o orçamento é criado na mesma transação da
inclusão. Na prática, é a terceira das três chamadas — em qualquer ordem — que
dispara tudo:

1. os totais dos três grupos são somados;
2. as peças e os insumos são reservados no estoque;
3. o orçamento é gravado com status `pending`;
4. a ordem vai para `awaiting_approval`;
5. o e-mail é enviado ao cliente.

A partir daí a ordem **não aceita mais alteração de itens** (**409**): incluir,
mudar quantidade ou remover só é permitido em `received` e `in_diagnosis`. Isso
protege o cliente de receber um orçamento diferente do que foi apresentado.

### Uma armadilha do TypeORM a não desfazer

`QuotesService.create` monta o orçamento com **duas** referências à ordem: o
escalar `serviceOrderId` e a relação `serviceOrder: { id } as ServiceOrder`.
Parece redundante e não é. Com apenas o escalar, o *relation updater* do
`@OneToOne` entende que a relação está vazia e dispara um
`UPDATE quotes SET service_order_id = NULL` logo depois do `INSERT`, violando o
`NOT NULL` e derrubando o fluxo com **500**. Quem "simplificar" essa linha
reintroduz o bug; o e2e do fluxo completo é a rede que pega isso.

O envio do e-mail é, nesta entrega, uma linha de log do `NotificationsService`
(`src/modules/notifications/notifications.service.ts`), com o número da ordem, o
nome e o e-mail do cliente e o valor total. O ponto de atenção "Enviado por
onde?" do board fica assim registrado e isolado atrás de um único método —
trocar o log por um provedor de e-mail real não toca em mais nada.

## Movimentação de estoque

`parts` e `supplies` ganharam a coluna `reserved_quantity`. O que está reservado
continua no estoque físico, mas não pode ser prometido a outra ordem:

```
disponível = stock_quantity - reserved_quantity
```

| Momento | Efeito no estoque |
| ------- | ----------------- |
| Inclusão de peça ou insumo na ordem | valida `disponível ≥ quantidade`; **409** se não houver |
| Orçamento gerado | `reserved_quantity += quantidade` |
| Cliente aprova | `stock_quantity -= quantidade` e `reserved_quantity -= quantidade` |
| Cliente recusa | `reserved_quantity -= quantidade`; o estoque físico não muda |
| Ordem em `awaiting_approval` é inativada | libera a reserva antes de inativar |

As quatro operações rodam dentro de uma transação, e cada peça ou insumo é lido
com bloqueio de escrita (`pessimistic_write`) antes de ter a quantidade
alterada. Sem isso, duas ordens montadas ao mesmo tempo poderiam reservar a
mesma última peça. É a primeira transação explícita do projeto; a lógica vive em
`PartsService` e `SuppliesService`, que são os donos das colunas, e é orquestrada
por ordem inteira pelo `StockReservationService`.

O `GET /parts` e o `GET /supplies` passaram a expor `reservedQuantity` e
`availableQuantity` junto de `stockQuantity`.

`minimumStock` continua sem disparar nada. O alerta de estoque baixo — o ponto
de atenção "Alerta?" do board — segue como evolução.

## As APIs públicas do cliente

Três rotas ficam abertas, todas endereçadas pelo **número da ordem**:

| Rota | O que devolve |
| ---- | ------------- |
| `GET /public/service-orders/:number/status` | apenas `number` e `status` |
| `GET /public/service-orders/:number/quote` | o orçamento, com placa, itens e totais |
| `POST /public/service-orders/:number/quote/approve` | aprova e coloca a ordem em execução |
| `POST /public/service-orders/:number/quote/reject` | recusa e finaliza a ordem |

O endpoint de status devolve **só o status**, deliberadamente. Nenhum dado do
cliente, do veículo, do diagnóstico ou dos itens sai por ali. O de orçamento
mostra a placa do veículo, para o cliente reconhecer de qual carro se trata, mas
não expõe nome, documento, e-mail nem os identificadores internos.

Responder duas vezes ao mesmo orçamento é **409**: só um orçamento `pending` de
uma ordem em `awaiting_approval` aceita resposta.

**Limitação conhecida.** O número da ordem é sequencial e as rotas não exigem
autenticação, então quem varrer números consegue ler o orçamento de terceiros e
aprová-lo ou recusá-lo. Foi uma decisão consciente de escopo do MVP, para o
cliente responder com um clique sem cadastro. A evolução natural é gerar um
token opaco por orçamento e endereçar essas rotas por ele, mantendo o número
apenas na consulta de status.

## O orçamento como recurso próprio

Além de vir embutido no `GET /service-orders/:id`, o orçamento tem rotas
próprias para `admin` e `mechanic`:

| Rota | O que devolve |
| ---- | ------------- |
| `GET /quotes` | todos os orçamentos, mais recentes primeiro |
| `GET /quotes?status=pending` | os que ainda aguardam resposta do cliente |
| `GET /quotes?serviceOrderId=<id>` | o orçamento de uma ordem específica |
| `GET /quotes/:id` | um orçamento pelo id |

O filtro por `status=pending` é o read model "quais orçamentos estão esperando o
cliente" — sai de graça do recurso e é o que a oficina olha no dia a dia.

## Métricas

Duas rotas restritas ao `admin`, ambas em segundos:

- `GET /metrics/service-orders/average-time-per-status` — tempo médio que as
  ordens passam em cada status, lido da coluna `status_durations` com
  `jsonb_each_text`.
- `GET /metrics/services/average-execution-time` — tempo médio em execução por
  serviço, que é o "monitoramento do tempo médio de execução dos serviços" do
  enunciado.

As métricas ficam sob `/metrics`, e não sob `/service-orders/metrics`, por um
motivo prático: aninhadas no recurso da OS elas precisariam ser declaradas
**antes** de `@Get(':id')` no controller, senão `metrics` seria capturado como
um id. Prefixo próprio elimina essa armadilha de ordem de declaração.

O `status_durations` é alimentado a cada transição: o tempo decorrido desde
`status_changed_at` é somado ao status que está sendo deixado, e
`status_changed_at` é reiniciado. Como o intervalo só é fechado na **saída** do
status, uma ordem ainda em execução não entra na média de `in_progress` — o que
é o comportamento correto para uma média de duração.

Guardar o acumulado em `jsonb` na própria ordem, em vez de uma tabela de
histórico de transições, mantém a consulta em um único `GROUP BY` e evita um
`JOIN` a mais em cada leitura. O custo é não guardar *quando* cada transição
aconteceu — se isso for necessário depois, a tabela de histórico passa a ser a
escolha certa.

## Exclusão é inativação

Como nos demais módulos, `DELETE /service-orders/:id` responde **204** e apenas
marca `isActive = false`.

Consequências:

- a ordem some do `GET /service-orders` e volta com `?includeInactive=true`;
- o `GET /service-orders/:id` continua respondendo, para não quebrar histórico;
- se a ordem estava em `awaiting_approval`, a reserva de estoque é devolvida
  antes da inativação — o contrário deixaria peças presas para sempre;
- reativar é `PATCH /service-orders/:id` com `{ "isActive": true }`.

## Erros esperados

| Situação | Status | Mensagem |
| -------- | ------ | -------- |
| Cliente, veículo, ordem ou item inexistente | **404** | `Ordem de serviço não encontrada.` e equivalentes |
| Ordem sem orçamento gerado | **404** | `Esta ordem de serviço ainda não tem orçamento.` |
| Cliente inativo na abertura | **409** | `Não é possível abrir uma ordem de serviço para um cliente inativo.` |
| Veículo inativo na abertura | **409** | `Não é possível abrir uma ordem de serviço para um veículo inativo.` |
| Veículo de outro cliente | **409** | `O veículo informado não pertence a este cliente.` |
| Estoque livre insuficiente | **409** | `Estoque insuficiente para a peça <código>.` |
| Item repetido na ordem | **409** | `Esta peça já está na ordem de serviço. Atualize a quantidade do item.` |
| Alterar itens depois do orçamento | **409** | `A ordem de serviço não aceita mais alteração de itens depois que o orçamento é gerado.` |
| Responder um orçamento já respondido | **409** | `Este orçamento não está aguardando aprovação.` |
| Transição de status inválida | **400** | `Não é possível mudar a ordem de serviço de <atual> para <destino>.` |
| Sem token nas rotas administrativas | **401** | — |
| Mecânico nas rotas de métricas | **403** | — |

## Testes

- Unitários: um spec ao lado de cada arquivo, distribuídos pelos cinco módulos —
  `stock.service.spec.ts`; `quotes.service.spec.ts` e `quotes.controller.spec.ts`;
  `service-orders.service.spec.ts`, `service-order-items.service.spec.ts`,
  `service-order-stock.util.spec.ts` e `service-orders.controller.spec.ts`;
  `service-order-workflow.service.spec.ts` mais os dois specs de controller do
  workflow; `service-order-metrics.service.spec.ts` e seu controller; e
  `notifications.service.spec.ts`. As transações são exercitadas com um
  `DataSource` falso cujo `transaction` executa o callback com um `EntityManager`
  mockado. Os cinco módulos estão em 100% de cobertura.
- Integração: um arquivo por módulo, todos contra o Postgres real.
  `src/test/service-orders.e2e-spec.ts` cobre abertura com número gerado,
  transições manuais válidas e inválidas e a inativação que devolve a reserva.
  `src/test/service-order-workflow.e2e-spec.ts` percorre o ciclo inteiro —
  inclusão dos três grupos com o orçamento nascendo no terceiro, alteração e
  remoção de item, consulta pública sem token, aprovação com baixa de estoque,
  recusa com devolução da reserva, finalização e entrega — e verifica a linha de
  log do `NotificationsService`. `src/test/quotes.e2e-spec.ts` cobre os filtros
  do recurso de orçamento e `src/test/service-order-metrics.e2e-spec.ts` as duas
  métricas, incluindo o **403** para mecânico.
  `src/test/stock.e2e-spec.ts` exercita a movimentação direto no `StockService`,
  com um caso de **concorrência** que prova o lock pessimista: duas transações
  disputando a última peça, só uma passa.

O e2e roda com `--maxWorkers=1` porque compartilha o mesmo banco.
