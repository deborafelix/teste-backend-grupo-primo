# Sistema de Transações Bancárias com Concorrência de Saldo - Grupo Primo

## Descrição

Uma API de um sistema de transações bancárias que suporta múltiplas transações concorrentes, garantindo a integridade do saldo da conta em todas as operações.


## Instalação de dependências

```bash
$ yarn install
```

## Para rodar a aplicação

```bash
$ docker-compose up -d
$ yarn migration:up

# development
$ yarn run start

# watch mode
$ yarn run start:dev
```
## Swagger

[Link para Swagger](http://localhost:3000/api)

## Cenários de Uso - Curl

### Sucesso
Criar conta: 
```
curl --location 'http://localhost:3000/account' \
--header 'Content-Type: application/json' \
--data '{
    "accountNumber": 123,
    "balance": 50
}'
```

Criar transação:
```
curl --location 'http://localhost:3000/transaction' \
--header 'Content-Type: application/json' \
--data '{
"type": "deposito",
"value": 50,
"account": 123
}'
```

Fazer operações:
```
curl --location 'http://localhost:3000/' \
--header 'Content-Type: application/json' \
--data '{
    "accounts": [
        {
            "accountNumber": 124,
            "balance": 500
        },
        {
            "accountNumber": 125,
            "balance": 50
        }
    ],
    "transactions": [
        {
            "type": "transferencia",
            "from": 124,
            "to": 125,
            "value": 50
        },
        {
            "type": "deposito",
            "account": 125,
            "value": 50
        },
        {
            "type": "saque",
            "account": 124,
            "value": 50
        }
    ]
}'
```
### Erros
Ao não enviar account number:
```
curl --location 'http://localhost:3000/account' \
--header 'Content-Type: application/json' \
--data '{
    "accountNumber": "",
    "balance": 50
}'
```
Conta não existe:
```
curl --location 'http://localhost:3000/transaction' \
--header 'Content-Type: application/json' \
--data '{
"type": "saque",
"value": 50,
"account": 999
}'
```

Saldo insuficiente:
```
curl --location 'http://localhost:3000/transaction' \
--header 'Content-Type: application/json' \
--data '{
"type": "saque",
"value": 10000,
"account": 123
}'
```

Criação de conta duplicada e saldo insuficiente:
```
curl --location 'http://localhost:3000/' \
--header 'Content-Type: application/json' \
--data '{
    "accounts": [
        {
            "accountNumber": 130,
            "balance": 50
        },
        {
            "accountNumber": 130,
            "balance": 50
        }
    ],
    "transactions": [
        {
            "type": "saque",
            "account": 130,
            "value": 50
        },
        {
            "type": "saque",
            "account": 130,
            "value": 50
        }
    ]
}'
```



## Testes unitários

```bash
# unit tests
$ yarn run test
```