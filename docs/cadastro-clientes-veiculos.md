# Cadastro de clientes e veículos

Este documento descreve o módulo de cadastro entregue sobre a fundação de
autenticação da Fase 1: o CRUD de clientes (`/customers`) e o CRUD de veículos
(`/vehicles`), ambos restritos ao papel `admin`.

## De onde vêm as regras

O bloco **Cadastro** do Event Storming do projeto define a sequência que estas
APIs materializam:

| Elemento do board | O que virou no código |
| ----------------- | --------------------- |
| Read model "Lista os clientes que já são cadastrados" | `GET /customers` |
| Comando "Identifica o cliente" → evento "Cliente identificado" | `GET /customers/document/:document` e `POST /customers` |
| Read model "Lista os veículos daquele cliente" | `GET /vehicles?customerId=<uuid>` |
| Comando "Identifica o veículo" → evento "Veículo cadastrado" | `GET /vehicles/plate/:plate` e `POST /vehicles` |
| Política "Criar OS com status recebida" | fase seguinte, fora deste escopo |

O enunciado do Tech Challenge exige, além do CRUD, a "identificação do cliente
por CPF/CNPJ", o "cadastro de veículo (placa, marca, modelo, ano)" e a
"validação dos dados sensíveis (CPF/CNPJ, placa de veículo)".

## Validação dos dados sensíveis

A validação acontece na camada de DTO, no `ValidationPipe` global — dado
inválido nunca chega ao service e a resposta é **400**.

### CPF e CNPJ

O decorator `@IsDocument()` (`src/common/decorators/is-document.decorator.ts`)
usa as funções puras de `src/common/utils/document.util.ts`:

- aceita o documento com ou sem máscara (`529.982.247-25` ou `52998224725`);
- confere os **dois dígitos verificadores** de CPF (11 dígitos) e de CNPJ
  (14 dígitos), pelo algoritmo oficial de módulo 11;
- rejeita sequências de um único dígito repetido (`111.111.111-11`), que passam
  no cálculo mas não são documentos válidos;
- rejeita qualquer outro comprimento.

O tipo do documento não é informado pelo cliente da API: `resolveDocumentType`
o deriva do comprimento e grava `cpf` ou `cnpj` na coluna `document_type`.

### Placa

O decorator `@IsPlate()` (`src/common/decorators/is-plate.decorator.ts`) usa
`src/common/utils/plate.util.ts` e aceita os dois formatos brasileiros com uma
única expressão, `/^[A-Z]{3}[0-9][0-9A-J][0-9]{2}$/`:

- padrão antigo `ABC1234` — a quinta posição é um dígito;
- padrão Mercosul `ABC1D23` — a quinta posição é uma letra de `A` a `J`.

Minúsculas, hífens e espaços são aceitos na entrada (`abc-1d23`).

## Normalização e armazenamento

O que entra formatado é gravado normalizado, para que a busca e a restrição de
unicidade funcionem independentemente da máscara usada:

| Campo | Entrada aceita | Gravado em banco |
| ----- | -------------- | ---------------- |
| `document` | `529.982.247-25` | `52998224725` (`varchar(14)`, único) |
| `plate` | `abc-1d23` | `ABC1D23` (`varchar(7)`, único) |

A busca por `GET /customers/document/:document` e por
`GET /vehicles/plate/:plate` normaliza o parâmetro antes de consultar, então
qualquer formatação funciona na URL.

## Exclusão é inativação

Nenhum registro de cadastro é apagado. `DELETE /customers/:id` e
`DELETE /vehicles/:id` respondem **204** e apenas marcam `is_active = false`,
preservando o histórico para as ordens de serviço das próximas fases.

Consequências:

- as listagens (`GET /customers` e `GET /vehicles`) trazem **apenas os ativos**;
  use `?includeInactive=true` para ver todos;
- `GET /customers/:id` e `GET /vehicles/:id` devolvem o registro mesmo inativo,
  para que o administrador possa reativá-lo;
- reativar é um `PATCH` com `{ "isActive": true }`;
- cadastrar ou transferir um veículo para um cliente inativo responde **409**;
- a FK `FK_vehicles_customer_id` usa `ON DELETE RESTRICT` como rede de
  segurança: como não existe exclusão física pela API, ela só entra em ação se
  alguém apagar um cliente direto no banco.

## Erros esperados

| Situação | Status | Mensagem |
| -------- | ------ | -------- |
| CPF/CNPJ inválido | 400 | `CPF/CNPJ inválido.` |
| Placa inválida | 400 | `Placa inválida.` |
| Campo fora do DTO | 400 | mensagem do `ValidationPipe` |
| Documento já cadastrado | 409 | `Já existe um cliente com este CPF/CNPJ.` |
| Placa já cadastrada | 409 | `Já existe um veículo com esta placa.` |
| Veículo para cliente inativo | 409 | `Não é possível cadastrar um veículo para um cliente inativo.` |
| Cliente inexistente | 404 | `Cliente não encontrado.` |
| Veículo inexistente | 404 | `Veículo não encontrado.` |
| Sem token | 401 | — |
| Token de mecânico | 403 | — |

## Testes

- Unitários: `src/common/utils/document.util.spec.ts`,
  `plate.util.spec.ts`, os specs dos dois decorators e os specs de service e
  controller dos dois módulos.
- Integração: `src/test/cadastro.e2e-spec.ts` percorre o fluxo completo
  (cadastro do cliente → cadastro do veículo → listagem por cliente →
  inativação) e confere os bloqueios 401 e 403.

Os testes e2e usam o mesmo banco da aplicação e truncam as tabelas de cadastro,
por isso o script `test:e2e` roda com `--maxWorkers=1`: duas suítes e2e em
paralelo apagariam os dados uma da outra.
