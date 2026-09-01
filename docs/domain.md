# Domínio

Regras de negócio da API da oficina mecânica, das decisões de arquitetura ao
comportamento de cada etapa. Os exemplos de chamada estão em
[api-examples.md](api-examples.md); a execução do projeto, no
[README](../README.md).

As regras vêm do Event Storming do Tech Challenge, cujos frames — Cadastro, Peças
e Insumos, e o ciclo da OS — deram origem, nessa ordem, às etapas descritas
abaixo.

## Como o código está organizado

A entrega tem 13 módulos. A divisão separa **o que persiste** do **que decide**:
quem guarda estado não conhece as políticas, e as políticas ficam num lugar só.

| Módulo | Responsabilidade | Conhece |
| ------ | ---------------- | ------- |
| `auth`, `users` | login, refresh com rotação, logout e RBAC (`admin`, `mechanic`) | — |
| `customers`, `vehicles` | cadastro do cliente e do veículo | `customers` |
| `services`, `parts`, `supplies` | catálogo e estoque físico | — |
| `stock` | reserva, consome e devolve estoque a partir de listas de `{ id, quantity }` | `parts`, `supplies` |
| `quotes` | o orçamento: totais, status e consulta | ninguém |
| `notifications` | envia o orçamento ao cliente | ninguém |
| `service-orders` | a OS: entidades, máquina de status, CRUD e os itens | cadastro, catálogo, `stock` |
| `service-order-workflow` | as políticas: quando gerar o orçamento, o que acontece ao aprovar e ao recusar | todos os acima |
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
`ServiceOrderItemsService` só grava o item; quem decide se aquele item fechou os
três grupos e dispara o orçamento é o `ServiceOrderWorkflowService`. Se o gatilho
morasse junto com os itens, `service-orders` precisaria de `quotes` e `quotes`
precisaria de `service-orders` — o ciclo que essa organização evita.
`QuotesService` é o caso mais claro: ele recebe totais já somados e não sabe o
que é uma ordem de serviço.

O Swagger em `/docs` reflete a mesma divisão, com um grupo por audiência:
`auth` e `users`; `customers` e `vehicles`; `services`, `parts` e `supplies`;
`service-orders` (a ordem), `service-order-items` (montagem), `quotes`,
`public` (o canal do cliente, sem token) e `metrics`.

## Autenticação e papéis

Access token de 10 minutos e refresh token com rotação — cada refresh revoga o
token usado e emite um novo par, e o logout revoga o refresh corrente. Os tokens
vivem na tabela `users_tokens`.

O RBAC é global, com dois papéis:

| Papel | Alcance |
| ----- | ------- |
| `admin` | tudo: cadastro, catálogo, ordens, orçamentos e métricas |
| `mechanic` | ordens de serviço e orçamentos (é quem monta a OS no dia a dia) |

As rotas de `/public/service-orders` não exigem token: são o canal do cliente.

## Cadastro de clientes e veículos

CRUDs restritos ao `admin`. A validação acontece na camada de DTO, no
`ValidationPipe` global — dado inválido nunca chega ao service, e a resposta é
**400**.

**CPF e CNPJ.** O decorator `@IsDocument()` aceita o documento com ou sem máscara,
confere os dois dígitos verificadores pelo algoritmo de módulo 11 e rejeita
sequências de um dígito repetido (`111.111.111-11`), que passam no cálculo mas
não são documentos válidos. O tipo não é informado pelo cliente da API:
`resolveDocumentType` o deriva do comprimento e grava `cpf` ou `cnpj`.

**Placa.** O decorator `@IsPlate()` aceita os dois padrões brasileiros com uma
única expressão, `/^[A-Z]{3}[0-9][0-9A-J][0-9]{2}$/` — o antigo `ABC1234`, com
dígito na quinta posição, e o Mercosul `ABC1D23`, com letra de `A` a `J`.
Minúsculas, hífens e espaços são aceitos na entrada.

**Normalização.** O que entra formatado é gravado normalizado, para que a busca e
a restrição de unicidade não dependam da máscara usada:

| Campo | Entrada aceita | Gravado em banco |
| ----- | -------------- | ---------------- |
| `document` | `529.982.247-25` | `52998224725` (único) |
| `plate` | `abc-1d23` | `ABC1D23` (único) |
| `code` (peça e insumo) | `flt oil-001` | `FLTOIL-001` (único) |

As buscas por documento, placa e código normalizam o parâmetro antes de
consultar, então qualquer formatação funciona na URL.

## Catálogo de serviços, peças e insumos

Três recursos que a ordem de serviço consome, todos restritos ao `admin`. Peça e
insumo são agregados distintos no board, daí dois módulos em vez de uma tabela
única de itens.

| Recurso | Campos próprios |
| ------- | --------------- |
| `services` | `name` (único), `description`, `price`, `estimatedMinutes` |
| `parts` | `code` (único), `name`, `description`, `brand`, `unitPrice`, campos de estoque |
| `supplies` | igual à peça, trocando `brand` por `unit` (`un`, `l`, `ml`, `kg`, `g`) |

`estimatedMinutes` é o tempo previsto de execução — é contra ele que o tempo real
medido na OS é comparado na métrica por serviço. A unidade de medida é o que
distingue o insumo da peça: peça se conta por unidade, insumo é consumido por
volume ou massa.

**Dinheiro em `numeric`.** `price` e `unitPrice` são `numeric(10,2)`, a escolha
correta para valores monetários, que não podem sofrer o arredondamento binário de
um `float`. Como o driver do Postgres devolve esse tipo como string, as colunas
usam o `moneyTransformer` (`src/common/utils/money.transformer.ts`) para
converter na leitura: na API o preço trafega sempre como número
(`"unitPrice": 49.9`, nunca `"49.90"`).

**Estoque.** `stockQuantity` e `minimumStock` são campos de cadastro: o
administrador abastece o estoque pelo `POST` e pelo `PATCH`. A movimentação —
reserva, consumo e devolução — não acontece por aqui; nasce de eventos da ordem
de serviço. O que a OS trouxe para essas tabelas foi a coluna `reserved_quantity`:

| Campo | Significado |
| ----- | ----------- |
| `stockQuantity` | o que existe fisicamente na prateleira |
| `reservedQuantity` | o que já está prometido a ordens aguardando aprovação |
| `availableQuantity` | `stockQuantity - reservedQuantity`, o que ainda pode ser prometido |

Um `PATCH` com `stockQuantity` sobrescreve o estoque físico e não mexe nas
reservas — é abastecimento, não movimentação. `minimumStock` ainda não dispara
nada: registra a quantidade mínima desejada e é a base do alerta de estoque
baixo, que segue como evolução.

## Ordem de serviço

A OS é o agregado que junta cliente, veículo e catálogo, calcula o preço e
caminha pelos status até a entrega.

### Dados

| Campo | Regra |
| ----- | ----- |
| `number` | gerado pelo banco como `OS-000001`; é o identificador que o cliente usa |
| `customerId` / `vehicleId` | ambos ativos, e o veículo tem de ser do mesmo cliente |
| `status` | um dos seis status do enunciado |
| `description` | relato do cliente ou diagnóstico da equipe |
| `statusDurations` | `jsonb` com os segundos acumulados em cada status já concluído |
| `statusChangedAt` | quando o status atual começou |

O número vem de uma sequence do Postgres (`service_orders_number_seq`) usada como
`DEFAULT` da coluna, não da aplicação: assim duas ordens abertas ao mesmo tempo
nunca recebem o mesmo número.

Os itens vivem em três tabelas de mesma forma (`service_order_services`,
`_parts`, `_supplies`), cada uma com a ordem, o item do catálogo, `quantity`,
`unitPrice` e `totalPrice`. O `unitPrice` é uma **cópia do preço do catálogo no
momento da inclusão**, não uma leitura viva: se o preço for reajustado depois, o
orçamento já enviado ao cliente continua valendo pelo valor que ele recebeu. Uma
restrição de unicidade impede o mesmo item duas vezes na mesma ordem — para mudar
a quantidade usa-se o `PATCH` do item.

O orçamento (`quotes`) guarda os totais por grupo, o `totalAmount`, o status
(`pending`, `approved`, `rejected`), o `sentAt` e o `respondedAt`. Uma ordem tem
no máximo um orçamento.

### Máquina de status

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

Três transições são **automáticas** e nascem de um evento do sistema: a geração
do orçamento leva a ordem para `awaiting_approval`; a aprovação do cliente leva
para `in_progress`; a recusa leva para `finished`. As três são recusadas com
**400** se alguém tentar aplicá-las pelo `PATCH /service-orders/:id/status`, que
só aceita as transições dependentes de ação da equipe —
`received → in_diagnosis`, `in_progress → finished` e `finished → delivered`.
Qualquer outro par também é **400**: não existe pular etapa nem voltar atrás.

Nenhuma transição acontece por decurso de prazo. Toda mudança de status tem uma
ação identificável por trás, o que mantém a linha do tempo auditável.

### Orçamento automático

Não há endpoint de geração. A cada inclusão de item a ordem é reavaliada: quando
passa a ter **pelo menos um serviço, uma peça e um insumo**, o orçamento é criado
na mesma transação da inclusão. Na prática é a terceira das três chamadas — em
qualquer ordem — que dispara tudo:

1. os totais dos três grupos são somados;
2. as peças e os insumos são reservados no estoque;
3. o orçamento é gravado com status `pending`;
4. a ordem vai para `awaiting_approval`;
5. o e-mail é enviado ao cliente.

A partir daí a ordem **não aceita mais alteração de itens** (**409**): incluir,
mudar quantidade ou remover só é permitido em `received` e `in_diagnosis`. Isso
protege o cliente de receber um orçamento diferente do que foi apresentado.

O envio do e-mail é, nesta entrega, uma linha de log do `NotificationsService`
com o número da ordem, o nome e o e-mail do cliente e o valor total. Trocar o log
por um provedor real não toca em mais nada — está isolado atrás de um método.

> **Armadilha do TypeORM a não desfazer.** `QuotesService.create` monta o
> orçamento com duas referências à ordem: o escalar `serviceOrderId` e a relação
> `serviceOrder: { id } as ServiceOrder`. Parece redundante e não é: com apenas o
> escalar, o *relation updater* do `@OneToOne` entende que a relação está vazia e
> dispara um `UPDATE quotes SET service_order_id = NULL` logo após o `INSERT`,
> violando o `NOT NULL` e derrubando o fluxo com 500. Quem "simplificar" essa
> linha reintroduz o bug; o e2e do fluxo completo é a rede que pega isso.

### Movimentação de estoque

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
com bloqueio de escrita (`pessimistic_write`) antes de ter a quantidade alterada.
Sem isso, duas ordens montadas ao mesmo tempo poderiam reservar a mesma última
peça. A lógica vive em `PartsService` e `SuppliesService`, donos das colunas, e é
orquestrada por ordem inteira pelo `StockReservationService`.

### As rotas públicas do cliente

Quatro rotas abertas, todas endereçadas pelo **número da ordem**:

| Rota | O que faz |
| ---- | --------- |
| `GET /public/service-orders/:number/status` | devolve apenas `number` e `status` |
| `GET /public/service-orders/:number/quote` | devolve o orçamento, com placa, itens e totais |
| `POST /public/service-orders/:number/quote/approve` | aprova e coloca a ordem em execução |
| `POST /public/service-orders/:number/quote/reject` | recusa e finaliza a ordem |

O endpoint de status devolve só o status, deliberadamente: nenhum dado do
cliente, do veículo, do diagnóstico ou dos itens sai por ali. O de orçamento
mostra a placa, para o cliente reconhecer de qual carro se trata, mas não expõe
nome, documento, e-mail nem identificadores internos. Responder duas vezes ao
mesmo orçamento é **409**.

> **Limitação conhecida.** O número da ordem é sequencial e as rotas não exigem
> autenticação, então quem varrer números consegue ler o orçamento de terceiros e
> aprová-lo ou recusá-lo. Foi decisão consciente de escopo do MVP, para o cliente
> responder com um clique sem cadastro. A evolução natural é gerar um token opaco
> por orçamento e endereçar essas rotas por ele, mantendo o número apenas na
> consulta de status.

### Métricas

Duas rotas restritas ao `admin`, ambas em segundos:

- `GET /metrics/service-orders/average-time-per-status` — tempo médio das ordens
  em cada status, lido de `status_durations` com `jsonb_each_text`.
- `GET /metrics/services/average-execution-time` — tempo médio em execução por
  serviço, que é o monitoramento pedido pelo enunciado.

`status_durations` é alimentado a cada transição: o tempo desde
`status_changed_at` é somado ao status que está sendo deixado, e o marcador
reinicia. Como o intervalo só fecha na **saída** do status, uma ordem ainda em
execução não entra na média de `in_progress` — o comportamento correto para uma
média de duração.

Guardar o acumulado em `jsonb` na própria ordem, em vez de uma tabela de
histórico, mantém a consulta em um único `GROUP BY` e evita um `JOIN` por
leitura. O custo é não guardar *quando* cada transição aconteceu; se isso for
necessário, a tabela de histórico passa a ser a escolha certa.

As métricas ficam sob `/metrics`, e não sob `/service-orders/metrics`, por um
motivo prático: aninhadas no recurso da OS, precisariam ser declaradas antes de
`@Get(':id')` no controller, senão `metrics` seria capturado como um id.

## Exclusão é inativação

Nenhum registro é apagado, em módulo nenhum. Todo `DELETE` responde **204** e
marca `is_active = false`, preservando o histórico. Consequências:

- as listagens trazem apenas os ativos; `?includeInactive=true` mostra todos;
- o `GET /:id` devolve o registro mesmo inativo, para permitir a reativação;
- reativar é um `PATCH` com `{ "isActive": true }`;
- cliente ou veículo inativo não aceita novo veículo nem nova ordem (**409**);
- inativar uma ordem em `awaiting_approval` devolve a reserva de estoque antes —
  o contrário deixaria peças presas para sempre.

## Erros esperados

| Situação | Status |
| -------- | ------ |
| CPF/CNPJ ou placa inválida, campo fora do DTO, valor negativo, unidade fora do enum | **400** |
| Transição de status inválida ou automática forçada pelo `PATCH` | **400** |
| Sem token nas rotas autenticadas | **401** |
| Papel sem permissão (mecânico no cadastro, catálogo ou métricas) | **403** |
| Cliente, veículo, item, ordem ou orçamento inexistente | **404** |
| Ordem sem orçamento gerado | **404** |
| Documento, placa, código ou nome de serviço já cadastrado | **409** |
| Cliente ou veículo inativo na abertura da ordem, ou veículo de outro cliente | **409** |
| Estoque livre insuficiente | **409** |
| Item repetido na mesma ordem | **409** |
| Alterar itens depois do orçamento gerado | **409** |
| Responder um orçamento já respondido | **409** |

As mensagens são em português e voltadas ao usuário, por exemplo
`Estoque insuficiente para a peça FLTOIL-001.`

## Dados de demonstração

`local/seeds/seed-demo.ts` popula o banco com um cenário completo. Ele roda
sozinho no `docker compose up`, logo depois do seed do admin.

O seed **não escreve SQL de INSERT**: sobe um contexto do Nest e usa os próprios
services da aplicação para montar as ordens exatamente como um usuário montaria
pela API. Assim todo invariante sai correto de graça — totais, reservas, baixa de
estoque e devolução foram produzidos pelo código de produção.

Só o **tempo** é falsificado. `status_durations` é preenchido com o intervalo real
entre transições, e um seed roda em segundos; o replay ingênuo produziria zeros e
as métricas não diriam nada. Por isso um passe de SQL retroage `created_at`,
`status_changed_at` e reescreve as durações com valores plausíveis, sorteados por
um gerador com **semente fixa** — `--reset` reproduz sempre os mesmos números. A
duração de `in_progress` deriva do `estimatedMinutes` dos serviços da ordem, o
que faz a métrica por serviço contar uma história verdadeira.

| Recurso | Total | Casos de borda plantados |
| ------- | ----- | ------------------------ |
| Usuários | admin + 3 mecânicos | `ana.carvalho@oficina.com` está **inativa** |
| Clientes | 12 | 8 CPF e 4 CNPJ; `Antigo Cliente ME` está **inativo** |
| Veículos | 20 | placas dos dois padrões; `FGH7G89` **inativo**; quatro clientes com mais de um carro |
| Serviços | 10 | `Lavagem técnica do motor` **inativo**; `estimatedMinutes` de 30 a 240 |
| Peças | 15 | `RADIAD-014` com estoque **zero**; `PALHET-013` **abaixo do mínimo**; `CARBUR-015` **inativa** |
| Insumos | 8 | as cinco unidades de medida; `SPRAYANT` **inativo** |
| Ordens | 44 | duas **inativadas** (`OS-000013` e `OS-000030`) |

Os mecânicos entram com a senha `Mecanico@123`. Como os números são sequenciais e
o seed é determinístico, cada faixa sempre cai no mesmo cenário:

| Ordens | Status | Orçamento | Serve para testar |
| ------ | ------ | --------- | ----------------- |
| `OS-000001` a `OS-000004` | `received` | — | listagem, detalhe e avanço para `in_diagnosis` |
| `OS-000005` a `OS-000009` | `in_diagnosis` | — | incluir, alterar e remover item |
| `OS-000010` a `OS-000017` | `awaiting_approval` | `pending` | as rotas públicas, estoque **reservado** |
| `OS-000018` a `OS-000025` | `in_progress` | `approved` | estoque **consumido**, avanço para `finished` |
| `OS-000026` a `OS-000030` | `finished` | `rejected` | recusa do cliente, reserva devolvida |
| `OS-000031` a `OS-000036` | `finished` | `approved` | ordens executadas, alimentam a métrica de execução |
| `OS-000037` a `OS-000044` | `delivered` | `approved` | ciclo completo |

Alguns erros ficam a um comando de distância: incluir a peça `RADIAD-014` numa
ordem em diagnóstico dá o 409 de estoque; tentar incluir item em `OS-000010` dá o
409 de ordem travada; incluir `Lavagem técnica do motor` ou `CARBUR-015` dá o 409
de item inativo; abrir ordem para `Antigo Cliente ME` dá o 409 de cliente
inativo.

**Idempotência e reset.** Sem argumento, o seed detecta que já semeou e não faz
nada — é o que permite repetir `docker compose up` sem duplicar ordens. Para
voltar ao estado conhecido, `npm run seed:demo -- --reset`: ele limpa as tabelas
de domínio, remove os mecânicos de demonstração (preserva o admin) e recria tudo.
Como o `TRUNCATE ... RESTART IDENTITY` reinicia a sequence, os números voltam a
partir de `OS-000001` e o mapa acima continua valendo.

**O e2e apaga esses dados**, porque usa o mesmo banco e trunca as tabelas. Para
voltar ao estado de demonstração:
`npm run seed && npm run seed:demo -- --reset`.

> **Uma limitação que o seed revelou.** O orçamento nasce assim que a ordem passa
> a ter item nos três grupos, e a partir daí ela trava. Na prática, **o último
> grupo preenchido só pode receber um item**. O seed contorna isso montando as
> ordens com um único insumo, incluído por último.

## Onde está cada coisa

```
src/common/            decorators (@IsDocument, @IsPlate, @Roles, @Public),
                       guards de RBAC e utils de normalização e de dinheiro
src/modules/           um diretório por módulo da tabela acima
src/database/migrations/  schema versionado, em SQL
local/seeds/
  seed-admin.ts        migrations + admin (essencial)
  seed-demo.ts         idempotência, --reset, orquestração e resumo
  demo/data.ts         clientes, veículos, catálogo e mecânicos
  demo/scenarios.ts    os roteiros de ordem e as receitas serviço → peças/insumos
  demo/clock.ts        gerador com semente, faixas de duração e o SQL de retroação
```

Os seeds ficam fora de `src/` porque o estágio de runtime do `local/Dockerfile`
copia apenas o `dist/` — eles não vão para a imagem da aplicação.
