# Exemplos de uso da API

Roteiro para demonstrar a API **pelo Swagger**, em
<http://localhost:3000/docs>, contra a stack recém-subida
(`docker compose -f local/docker-compose.yml up -d --build`).

Como a própria página monta a URL, o método e os headers, aqui está só o que ela
não tem: **o body de cada requisição** e **o que fazer com a resposta**. Cada
passo é sempre a mesma sequência de cliques — abrir a rota, **Try it out**, colar
o body, **Execute** — e o que muda de um para o outro é o JSON.

São dois fluxos, os mesmos dois do Event Storming: o ciclo completo de uma ordem
de serviço e a gestão de peças e insumos, da peça que não existe até a devolução
ao estoque. As regras por trás de cada resposta estão em [domain.md](domain.md).

> Os dados dos `POST` abaixo **não existem no seed de demonstração** — são
> criados por você durante o roteiro. Nada colide com os 12 clientes, 20
> veículos, 10 serviços, 15 peças e 8 insumos que já estão no banco.
>
> Se o banco tiver sido truncado por uma rodada de e2e, repopule antes com
> `npm run seed && npm run seed:demo -- --reset`.

---

## 0. Autorizar

Sem isso, tudo responde **401**.

**0.1 — `POST /auth/login`** (rota pública, sem o cadeado)

```json
{
  "email": "admin@oficina.com",
  "password": "Admin@123"
}
```

**0.2 —** Copie o `accessToken` da resposta, clique em **Authorize** no topo da
página e cole **só o token**, sem escrever `Bearer` na frente — o Swagger já
adiciona o prefixo. Confirme em **Authorize** e feche a janela.

**0.3 —** Confira com `GET /auth/me`: a resposta traz o admin e o papel `admin`.

O access token dura **10 minutos**. Quando as rotas começarem a devolver 401,
repita o 0.1 e o 0.2 com o token novo.

As rotas de `public/service-orders` aparecem **sem cadeado**: são as do cliente e
funcionam mesmo com o Swagger deslogado.

---

## Fluxo 1 — Ordem de serviço, do cadastro à entrega

O caminho feliz inteiro: cliente identificado, veículo cadastrado, ordem aberta,
diagnóstico, itens incluídos, orçamento gerado sozinho, cliente aprova, serviço
executado e carro entregue.

### 1.1 Procurar o cliente

**`GET /customers/document/12345678909`**

Responde **404 `Cliente não encontrado.`** — é assim que a equipe descobre que
precisa cadastrá-lo. Esse é o passo *identifica o cliente* do Event Storming.

### 1.2 Cadastrar o cliente

**`POST /customers`**

```json
{
  "name": "Camila Duarte",
  "document": "123.456.789-09",
  "email": "camila.duarte@exemplo.com",
  "phone": "(11) 97654-3210"
}
```

O CPF pode ir com ou sem máscara; é validado pelos dígitos verificadores e
gravado só com números. **Guarde o `id` da resposta** — ele é o `customerId` dos
próximos passos.

### 1.3 Cadastrar o veículo

**`POST /vehicles`**

```json
{
  "plate": "rsa-2b34",
  "brand": "Honda",
  "model": "Civic",
  "year": 2022,
  "customerId": "<id do 1.2>"
}
```

A placa aceita os dois padrões, com ou sem hífen, e é gravada em maiúsculas e sem
máscara: `RSA2B34`. **Guarde o `id` da resposta** — é o `vehicleId`.

### 1.4 Abrir a ordem de serviço

**`POST /service-orders`**

```json
{
  "customerId": "<id do 1.2>",
  "vehicleId": "<id do 1.3>",
  "description": "Cliente relata barulho na suspensão e pediu revisão de óleo."
}
```

A ordem nasce em `received` e o banco atribui o `number`. **Guarde o `id` e o
`number`** — o `id` é usado pela equipe, o `number` é o que o cliente recebe.
Com o seed padrão (44 ordens), a sua será `OS-000045`.

### 1.5 Iniciar o diagnóstico

**`PATCH /service-orders/{id}/status`**

```json
{ "status": "in_diagnosis" }
```

### 1.6 Pegar os ids do catálogo

Três consultas, só para copiar `id`:

- **`GET /services`** — copie o `id` de `Troca de óleo` e o de
  `Alinhamento e balanceamento`;
- **`GET /parts/code/FLTOIL-001`** — copie o `id`;
- **`GET /parts/code/FLTAR-002`** — copie o `id`;
- **`GET /supplies/code/OLEO5W30`** — copie o `id`.

### 1.7 Incluir os serviços

**`POST /service-orders/{orderId}/services`**, uma vez para cada:

```json
{ "serviceId": "<id de Troca de óleo>", "quantity": 1 }
```

```json
{ "serviceId": "<id de Alinhamento e balanceamento>", "quantity": 1 }
```

### 1.8 Incluir as peças

**`POST /service-orders/{orderId}/parts`**, uma vez para cada:

```json
{ "partId": "<id de FLTOIL-001>", "quantity": 1 }
```

```json
{ "partId": "<id de FLTAR-002>", "quantity": 1 }
```

### 1.9 Incluir o insumo — e o orçamento nasce

**`POST /service-orders/{orderId}/supplies`**

```json
{ "supplyId": "<id de OLEO5W30>", "quantity": 4 }
```

> **Deixe o insumo por último e mande um só.** O orçamento é gerado
> automaticamente quando os três grupos passam a ter pelo menos um item, e a
> partir daí a ordem **não aceita mais alteração de itens** (**409**). Na prática
> o último grupo preenchido só recebe um item — por isso os dois serviços e as
> duas peças vêm antes.

A resposta desta chamada já traz o orçamento e a ordem aguardando o cliente:

```json
{
  "number": "OS-000045",
  "status": "awaiting_approval",
  "quote": {
    "status": "pending",
    "servicesTotal": 339.8,
    "partsTotal": 118.4,
    "suppliesTotal": 154,
    "totalAmount": 612.2
  }
}
```

### 1.10 Ver a notificação enviada ao cliente

O envio do e-mail é, nesta entrega, uma linha de log:

```bash
docker logs mechanic-workshop-api | grep NotificationsService
```

```
[NotificationsService] E-mail do orçamento da ordem OS-000045 enviado para Camila Duarte <camila.duarte@exemplo.com> no valor de R$ 612.20.
```

### 1.11 O cliente acompanha, sem token

As duas rotas são endereçadas pelo **número** da ordem, não pelo id:

- **`GET /public/service-orders/OS-000045/status`** — devolve só `number` e
  `status`, nada do cliente nem do veículo;
- **`GET /public/service-orders/OS-000045/quote`** — devolve a placa, os itens e
  os totais.

### 1.12 O cliente aprova

**`POST /public/service-orders/OS-000045/quote/approve`** (sem body)

A resposta é o **orçamento**, agora com `status: "approved"`. A ordem em si foi
levada para `in_progress` pela própria aprovação — confirme com
`GET /service-orders/{id}`. A aprovação também dá baixa no estoque das peças e
insumos. Responder duas vezes o mesmo orçamento é **409**.

### 1.13 Concluir o serviço

**`PATCH /service-orders/{id}/status`**

```json
{ "status": "finished" }
```

### 1.14 Entregar o carro

**`PATCH /service-orders/{id}/status`**

```json
{ "status": "delivered" }
```

Um `GET /service-orders/{id}` fecha o fluxo: `status: "delivered"`, o orçamento
`approved` e o `statusDurations` com os segundos acumulados em cada status já
concluído.

> Só três transições são manuais: `received → in_diagnosis`,
> `in_progress → finished` e `finished → delivered`. As outras três nascem de um
> evento — orçamento gerado, cliente aprova, cliente recusa — e forçá-las pelo
> `PATCH` é **400**.

---

## Fluxo 2 — Gestão de peças e insumos

Aqui o interesse é o estoque: a peça que ainda não existe, o estoque que não
cobre a ordem, e o ciclo **reserva → consumo** de um lado, **reserva →
devolução** do outro. Os números de estoque são conferíveis a cada passo.

### 2.1 Procurar a peça

**`GET /parts/code/BOMBAG-016`**

Responde **404 `Peça não encontrada.`**. É o caminho de exceção do Event
Storming: a equipe valida se a peça existe, não existe, e o admin cadastra.

### 2.2 Cadastrar a peça — de propósito, com estoque curto

**`POST /parts`**

```json
{
  "code": "bombag-016",
  "name": "Bomba d'água",
  "description": "Bomba d'água do sistema de arrefecimento.",
  "brand": "Valeo",
  "unitPrice": 289.9,
  "stockQuantity": 1,
  "minimumStock": 2
}
```

O código é gravado sem espaços e em maiúsculas: `BOMBAG-016`. A resposta traz
`stockQuantity: 1`, `reservedQuantity: 0` e `availableQuantity: 1` — já **abaixo
do mínimo**, que é o alerta de reposição.

### 2.3 Cadastrar o insumo

**`POST /supplies`**

```json
{
  "code": "FLDARREF",
  "name": "Fluido de arrefecimento pronto uso",
  "description": "Fluido de arrefecimento orgânico, pronto para uso.",
  "unit": "l",
  "unitPrice": 32.9,
  "stockQuantity": 60,
  "minimumStock": 15
}
```

A unidade é uma de `un`, `l`, `ml`, `kg` ou `g`.

### 2.4 Cadastrar o serviço

**`POST /services`**

```json
{
  "name": "Troca da bomba d'água",
  "description": "Substituição da bomba d'água e do fluido de arrefecimento.",
  "price": 540,
  "estimatedMinutes": 180
}
```

### 2.5 Cadastrar o cliente da frota e dois veículos

**`POST /customers`**

```json
{
  "name": "Transfrota Log LTDA",
  "document": "19.283.746/0001-88",
  "email": "frota@transfrota.com.br",
  "phone": "(11) 3344-5566"
}
```

**`POST /vehicles`**, duas vezes:

```json
{
  "plate": "MEC7C21",
  "brand": "Fiat",
  "model": "Ducato",
  "year": 2021,
  "customerId": "<id do 2.5>"
}
```

```json
{
  "plate": "TRF3D45",
  "brand": "Renault",
  "model": "Master",
  "year": 2023,
  "customerId": "<id do 2.5>"
}
```

### 2.6 Abrir a primeira ordem, na Ducato

**`POST /service-orders`**

```json
{
  "customerId": "<id do 2.5>",
  "vehicleId": "<id da MEC7C21>",
  "description": "Vazamento no sistema de arrefecimento, suspeita da bomba d'água."
}
```

E, em seguida, **`PATCH /service-orders/{id}/status`**:

```json
{ "status": "in_diagnosis" }
```

### 2.7 Tentar incluir a peça sem estoque

**`POST /service-orders/{orderId}/parts`** — o `partId` é o `id` do 2.2:

```json
{ "partId": "<id de BOMBAG-016>", "quantity": 2 }
```

Responde **409 `Estoque insuficiente para a peça BOMBAG-016.`** — só há 1
disponível. A validação é contra o **disponível**, não contra o físico:

```
disponível = stockQuantity - reservedQuantity
```

### 2.8 Repor o estoque

**`PATCH /parts/{id}`**

```json
{ "stockQuantity": 12 }
```

`availableQuantity` volta a 12 e a peça sai de baixo do mínimo.

### 2.9 Incluir a peça, agora com estoque

Repita o 2.7, com o mesmo body. Agora responde **201**. Repare: nada foi
reservado ainda — `GET /parts/code/BOMBAG-016` continua com
`reservedQuantity: 0`. A reserva acontece na geração do orçamento, não na
inclusão do item.

### 2.10 Completar a ordem — a reserva acontece aqui

**`POST /service-orders/{orderId}/services`**

```json
{ "serviceId": "<id do 2.4>", "quantity": 1 }
```

**`POST /service-orders/{orderId}/supplies`** — por último, e um só:

```json
{ "supplyId": "<id do 2.3>", "quantity": 3 }
```

A resposta traz o orçamento `pending` com `totalAmount` de **1218,50** e a ordem
em `awaiting_approval`. **Guarde o `number`.**

### 2.11 Conferir a reserva

**`GET /parts/code/BOMBAG-016`**

```json
{ "stockQuantity": 12, "reservedQuantity": 2, "availableQuantity": 10 }
```

**`GET /supplies/code/FLDARREF`**

```json
{ "stockQuantity": 60, "reservedQuantity": 3, "availableQuantity": 57 }
```

O estoque físico não mudou: as duas bombas estão **separadas** para esta ordem,
mas ainda são da oficina.

### 2.12 Cliente aprova — o estoque é consumido

**`POST /public/service-orders/{number}/quote/approve`** (sem body)

A resposta é o orçamento com `status: "approved"`.

**`GET /parts/code/BOMBAG-016`**

```json
{ "stockQuantity": 10, "reservedQuantity": 0, "availableQuantity": 10 }
```

**`GET /supplies/code/FLDARREF`**

```json
{ "stockQuantity": 57, "reservedQuantity": 0, "availableQuantity": 57 }
```

Agora sim as peças saíram do estoque. Um `GET /service-orders/{id}` mostra a
ordem em `in_progress`.

### 2.13 Abrir a segunda ordem, na Master

Repita o 2.6 com o `vehicleId` da **TRF3D45**, avance para `in_diagnosis` e monte
a ordem na mesma sequência do 2.9 e do 2.10, com quantidades maiores:

```json
{ "partId": "<id de BOMBAG-016>", "quantity": 3 }
```

```json
{ "serviceId": "<id do 2.4>", "quantity": 1 }
```

```json
{ "supplyId": "<id do 2.3>", "quantity": 2 }
```

Orçamento de **1475,50** gerado. **`GET /parts/code/BOMBAG-016`** mostra a nova
reserva:

```json
{ "stockQuantity": 10, "reservedQuantity": 3, "availableQuantity": 7 }
```

### 2.14 Cliente recusa — a reserva volta

**`POST /public/service-orders/{number}/quote/reject`** (sem body)

A resposta é o orçamento com `status: "rejected"`.

**`GET /parts/code/BOMBAG-016`**

```json
{ "stockQuantity": 10, "reservedQuantity": 0, "availableQuantity": 10 }
```

A reserva foi liberada e o **estoque físico não mudou** — nada foi consumido,
porque o serviço não vai acontecer. Um `GET /service-orders/{id}` mostra a ordem
em `finished`: a recusa encerra o ciclo.

### O ciclo inteiro, em uma tabela

| Momento | Efeito no estoque | Onde você viu |
| ------- | ----------------- | ------------- |
| Inclusão da peça na ordem | valida `disponível ≥ quantidade`; **409** se faltar | 2.7 e 2.9 |
| Orçamento gerado | `reservedQuantity += quantidade` | 2.11 |
| Cliente aprova | `stockQuantity -= quantidade` e `reservedQuantity -= quantidade` | 2.12 |
| Cliente recusa | `reservedQuantity -= quantidade`; o físico não muda | 2.14 |

As quatro operações rodam em transação, com bloqueio de escrita em cada peça e
insumo. O detalhe está em [domain.md](domain.md#movimentação-de-estoque).
