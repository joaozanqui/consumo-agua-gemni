# Projeto Docker-Node

Aplicação para registrar inscrições de alunos em atividades.
## Visão Geral

Foi desenvolvido o back-end de um serviço que gerencia a leitura individualizada de consumo de água e gás. Para facilitar a coleta da informação, o serviço foi integrado com a API do Google Gemini para obter a medição através da foto de um medidor.

### Backend

O backend foi construído utilizando Node e linguagem Typescript, que se conecta a um banco de dados Postgres gerenciado pela ORM (Object-Relational Mapping) Prisma.

### Docker

Para este projeto foi utilizado o ambiente de virtualização Docker.

### API Gemini

A aplicação recebe uma variável de ambiente para a execução: GEMINI_API_KEY=<chave_da_API>. A chave pode ser obtida seguindo a [Documentação da API do Google Gemini](https://ai.google.dev/gemini-api/docs/api-key)
Será preciso obter uma chave de acesso para usar a funcionalidade. Ela é gratuita.

## Instalação Local

Para executar este projeto localmente, siga os passos abaixo:

1. Clone o repositório do projeto:
   ```bash
   git clone https://github.com/joaozanqui/projeto-docker-node-gemini.git
2. Navegue até os arquivos do projeto:
    ``` bash
    cd projeto-docker-node-gemini/
3. Criação de um arquivo .env:
    ```bash
    touch .env
4. Adicionar a Variável de Ambiente no arquivo .env:
   ```bash
   GEMINI_API_KEY=<chave_da_API>
5. Execute o comando de inicialização do Docker e criação das imagens:
    ```bash
    docker-compose up --build
    ```
6. Utilize alguma ferramenta cliente de API REST, como Postman ou Insomnia para testar as funcionalidades do serviço. O servidor estará rodando na porta 3000.

## Funcionalidades
Para as requisições foi utilizado a ferramenta Insomnia.

1. **POST /upload**: Responsável por receber a imagem em base 64, consultar a IA do Google Gemini e retornar a medida lida pela API (Requisição no formato Multipart).

   - Request Body
      - *image*: Arquivo .txt
        - Imagem do medidor em base 64
      - *customer_code*: String
        - Código do cliente
      - *measure_type*: String
        - Tipo da medição (WATER ou GAS)
       
    - Response Body
      - *measure_uuid*: Number
        - ID gerado para a medição
      - *measure_value*: String
        - Valor da medição retornado pela IA do Google Gemini
      - *image_url*: String
        - Link local gerado para acessar a imagem
           
   ![.](https://beeimg.com/images/m51019978974.png)

  
2. **PATCH /confirm**: Responsável por confirmar ou corrigir o valor lido pelo Gemini.

   - Request Body
      - *measure_uuid*: Number
        - ID da medição
      - *confirmed_value*: Number
        - Valor da medição confirmado
    
    - Response Body
      - *success*: true
        - Resposta de OK, indicando que o valor foi salvo no banco de dados

          
   ![.](https://beeimg.com/images/l62924280624.png)

3. **GET /<customer_code>/list**: Retorna as medições registradas vinculadas ao customer_code
     - Response Body
        - *measure_uuid*: Number
          - ID da medição
        - *measure_datetime*: String
          - Data em que a medição foi registrada
        - *measure_type*: String
          - Tipo da medição (WATER ou GAS)
        - *has_confirmed*: Boolean
          - Variável indicando se a medição foi confirmada ou não
        - *image_url*: String
          - Link local gerado para acessar a imagem
           
   ![.](https://beeimg.com/images/j48321972654.png)

3. **GET /<customer_code>/list?measure_type=<measure_type>**: Retorna as medições registradas vinculadas ao customer_code filtradas apenas aos valores do tipo especificado 
   ![.](https://beeimg.com/images/t55816534152.png)
   
4. **GET /image/measure_uuid**: Retorna a imagem referente ao índice measure_uuid
     - Response Body
     ![.](https://beeimg.com/images/m73802595972.png)


## Tratamento de Erros

### POST /upload
- Valida o tipo de dados dos parâmetros enviados (inclusive o base64)
- Verifica se já existe uma leitura no mês naquele tipo de leitura.

### PATCH /confirm
- Validar o tipo de dados dos parâmetros enviados
- Verificar se o código de leitura informado existe
- Verificar se o código de leitura já foi confirmado

### GET /<customer_code>/list
- Verifica se existe registros vinculados ao customer_code

### GET /<customer_code>/list?measure_type=<measure_type>
- Verifica se o parâmetro measure_type é diferente de WATER ou GAS
- Verifica se existe registros do tipo measure_type vinculados ao customer_code
