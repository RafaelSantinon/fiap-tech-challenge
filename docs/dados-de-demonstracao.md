# Dados de demonstração

Este documento descreve o que `local/seeds/seed-demo.ts` cria no banco e como
usar esses dados para testar a API à mão, sem precisar inserir nada.

O seed roda sozinho no `docker compose up`, logo depois do seed do admin. A API
só sobe quando os dois terminam (`service_completed_successfully`).

## Como o seed é construído

Ele **não escreve SQL de INSERT**. Sobe um contexto do Nest e usa os próprios
services da aplicação — `ServiceOrdersService`, `ServiceOrderWorkflowService`,
`PartsService` e os demais — para montar as ordens exatamente como um usuário
montaria pela API. A consequência é que todo invariante sai correto de graça: os
totais do orçamento, o `reserved_quantity` das peças, a baixa de estoque na
aprovação e a devolução na recusa foram produzidos pelo código de produção, não
copiados à mão para o seed.

Só uma coisa é falsificada: **o tempo**. `status_durations` é preenchido pela
aplicação com o intervalo real entre transições, e um seed roda em segundos —
o replay ingênuo produziria `{"received":0}` e as métricas devolveriam zero.
Por isso, depois do replay, um passe de SQL retroage `created_at`,
`status_changed_at` e reescreve `status_durations` com valores plausíveis
(`local/seeds/demo/clock.ts`).

As durações vêm de um gerador pseudoaleatório com **semente fixa**: rodar
`--reset` reproduz exatamente os mesmos números, então os exemplos deste
documento continuam válidos.

| Status | Faixa sorteada |
| ------ | -------------- |
| `received` | 5 min a 30 min |
| `in_diagnosis` | 30 min a 4 h |
| `awaiting_approval` | 1 h a 3 dias |
| `in_progress` | derivado do `estimatedMinutes` dos serviços da ordem, com variação de 0,8× a 1,4× |
| `finished` | 2 h a 4 dias |

O `in_progress` ser derivado do serviço é o que faz a métrica por serviço contar
uma história verdadeira: `Troca de embreagem` (240 min estimados) aparece com
média muito maior que `Substituição da bateria` (30 min).

## O que é criado

| Recurso | Total | Casos de borda plantados |
| ------- | ----- | ------------------------ |
| Usuários | admin + 3 mecânicos | `ana.carvalho@oficina.com` está **inativa** |
| Clientes | 12 | 8 CPF e 4 CNPJ; `Antigo Cliente ME` está **inativo** |
| Veículos | 20 | placas dos dois padrões; `FGH7G89` está **inativo**; quatro clientes têm mais de um carro |
| Serviços | 10 | `Lavagem técnica do motor` está **inativo**; `estimatedMinutes` de 30 a 240 |
| Peças | 15 | `RADIAD-014` com estoque **zero**; `PALHET-013` **abaixo do mínimo**; `CARBUR-015` **inativa** |
| Insumos | 8 | as cinco unidades de medida; `SPRAYANT` **inativo** |
| Ordens | 44 | duas **inativadas** (`OS-000013` e `OS-000030`) |

Os mecânicos entram com a senha `Mecanico@123`.

## O mapa das ordens

Os números são sequenciais e o seed é determinístico, então cada faixa sempre
cai no mesmo cenário:

| Ordens | Status | Orçamento | Serve para testar |
| ------ | ------ | --------- | ----------------- |
| `OS-000001` a `OS-000004` | `received` | — | listagem e detalhe, `PATCH` da descrição, avanço para `in_diagnosis` |
| `OS-000005` a `OS-000009` | `in_diagnosis` | — | incluir, alterar e remover item; ordem sem orçamento ainda |
| `OS-000010` a `OS-000017` | `awaiting_approval` | `pending` | as quatro rotas públicas, estoque **reservado** |
| `OS-000018` a `OS-000025` | `in_progress` | `approved` | estoque **consumido**, avanço para `finished` |
| `OS-000026` a `OS-000030` | `finished` | `rejected` | recusa do cliente, reserva devolvida |
| `OS-000031` a `OS-000036` | `finished` | `approved` | ordens executadas, alimentam a métrica de execução |
| `OS-000037` a `OS-000044` | `delivered` | `approved` | ciclo completo |

`OS-000013` e `OS-000030` estão inativadas: só aparecem com
`GET /service-orders?includeInactive=true`.

## Roteiros de teste manual

**Aprovar um orçamento como cliente, sem token:**

```bash
curl http://localhost:3000/public/service-orders/OS-000010/status
curl http://localhost:3000/public/service-orders/OS-000010/quote
curl -X POST http://localhost:3000/public/service-orders/OS-000010/quote/approve
```

A ordem passa para `in_progress` e o estoque das peças dela é baixado. Para a
recusa, use `OS-000011` com `/quote/reject` — ali a reserva volta e a ordem vai
para `finished`.

**Ver o 409 de estoque insuficiente:** inclua a peça `RADIAD-014` (estoque zero)
em qualquer ordem de `OS-000005` a `OS-000009`.

**Ver o 409 de ordem travada:** tente incluir um item em `OS-000010` — depois do
orçamento gerado a ordem não aceita mais alteração.

**Ver o 409 de item inativo:** inclua o serviço `Lavagem técnica do motor` ou a
peça `CARBUR-015` numa ordem em diagnóstico.

**Ver o 409 de cliente inativo:** tente abrir uma ordem para
`Antigo Cliente ME`, ou cadastrar um veículo para ele.

**Ver as métricas:** as duas rotas de `/metrics` já respondem com números logo
após o seed, sem preparar nada.

```bash
curl http://localhost:3000/metrics/service-orders/average-time-per-status \
  -H 'Authorization: Bearer <accessToken>'
curl http://localhost:3000/metrics/services/average-execution-time \
  -H 'Authorization: Bearer <accessToken>'
```

O `average-time-per-status` traz os cinco status já concluídos por alguma ordem;
`delivered` não aparece porque nenhuma ordem saiu dele — o intervalo de um
status só fecha quando a ordem o deixa.

## Idempotência e reset

Sem argumento, o seed detecta que já semeou e não faz nada. É o que permite
repetir `docker compose up` sem duplicar ordens nem apagar o que você criou
testando:

```
[seed:demo] dados de demonstração já presentes, nada a fazer.
```

Para voltar ao estado conhecido:

```bash
npm run seed:demo -- --reset
```

O `--reset` limpa as tabelas de domínio, remove os três mecânicos de
demonstração (preserva o admin) e recria tudo. Como o `TRUNCATE ... RESTART
IDENTITY` reinicia a sequence `service_orders_number_seq`, os números voltam a
partir de `OS-000001` e o mapa acima continua valendo.

## O e2e apaga os dados de demonstração

Os testes de integração truncam todas as tabelas de domínio no `beforeAll` e no
`afterAll`, porque usam o mesmo banco da aplicação. Rodar `npm run test:e2e`
deixa o banco vazio.

Para voltar ao estado de demonstração depois de testar:

```bash
npm run seed && npm run seed:demo -- --reset
```

## Uma limitação que o seed revelou

O orçamento é gerado assim que a ordem passa a ter item nos **três** grupos, e a
partir daí ela não aceita mais alteração de itens. Na prática isso significa que
**o último grupo preenchido só pode receber um item**: ao incluir o primeiro
insumo de uma ordem que já tem serviço e peça, o orçamento nasce e a ordem trava
antes que um segundo insumo possa entrar.

O seed contorna isso montando as ordens com um único insumo, incluído por
último. Se no futuro o gatilho passar a ser explícito, ou a trava passar a valer
só depois do envio ao cliente, o seed pode voltar a montar ordens com vários
insumos.

## Onde fica

```
local/seeds/
  seed-admin.ts     migrations + admin (essencial)
  seed-demo.ts      entrypoint: idempotência, --reset, orquestração e resumo
  demo/
    data.ts         clientes, veículos, catálogo e mecânicos
    scenarios.ts    os roteiros de ordem e as receitas serviço → peças/insumos
    clock.ts        gerador com semente, faixas de duração e o SQL de retroação
```

Tudo fora de `src/`, como manda a regra 3 do `CLAUDE.md`: o estágio de runtime
do `local/Dockerfile` copia apenas o `dist/`, então o seed **não vai para a
imagem da aplicação**.
