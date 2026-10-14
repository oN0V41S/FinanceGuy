export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Controle Financeiro API',
    version: '1.0.0',
    description: 'API para gerenciamento de transações financeiras',
  },
  paths: {
    '/api/auth/register': {
      post: {
        summary: 'Registrar novo usuário',
        tags: ['Auth'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 2 },
                  nickname: { type: 'string', minLength: 2 },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                },
                required: ['name', 'nickname', 'email', 'password'],
              },
            },
          },
        },
        responses: { 201: { description: 'Usuário criado' }, 400: { description: 'Validação falhou' } },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Login de usuário',
        tags: ['Auth'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 1 },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: { 200: { description: 'Login realizado com sucesso' }, 401: { description: 'Falha na autenticação' } },
      },
    },
    '/api/auth/logout': {
      post: {
        summary: 'Logout de usuário',
        tags: ['Auth'],
        responses: { 200: { description: 'Logout realizado com sucesso' } },
      },
    },
    '/api/ai/ask': {
      post: {
        summary: 'Perguntar ao assistente de IA (Gemini) sobre as finanças do usuário',
        tags: ['AI'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  question: { type: 'string', minLength: 1, maxLength: 500 },
                },
                required: ['question'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Resposta do assistente (Cache-Control: no-store)',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    answer: { type: 'string' },
                    truncated: { type: 'boolean' },
                  },
                  required: ['answer', 'truncated'],
                },
              },
            },
          },
          400: { description: 'Corpo inválido, pergunta vazia ou acima de 500 caracteres' },
          401: { description: 'Usuário não identificado' },
          422: { description: 'Pergunta bloqueada pelo provedor' },
          429: { description: 'Limite de perguntas atingido (minuto ou dia); inclui header Retry-After' },
          500: { description: 'Erro interno ou falha ao carregar dados financeiros' },
          502: { description: 'Resposta inesperada do provedor' },
          503: { description: 'Assistente indisponível, com alta demanda ou sem conexão' },
          504: { description: 'Timeout ao consultar o provedor' },
        },
      },
    },
    '/api/transactions': {
      get: {
        summary: 'Listar transações',
        tags: ['Transactions'],
        parameters: [
          { name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } },
          { name: 'category', in: 'query', schema: { type: 'string' } },
          { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date' } },
        ],
        responses: { 200: { description: 'Lista de transações' } },
      },
      post: {
        summary: 'Criar transação',
        tags: ['Transactions'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['income', 'expense'] },
                  description: { type: 'string', minLength: 1, maxLength: 255 },
                  value: { type: 'number', minimum: 0 },
                  date: { type: 'string', format: 'date' },
                  category: { type: 'string' },
                  responsible: { type: 'string', minLength: 1, maxLength: 100 },
                },
                required: ['type', 'description', 'value', 'date', 'category', 'responsible'],
              },
            },
          },
        },
        responses: { 201: { description: 'Transação criada' }, 400: { description: 'Validação falhou' } },
      },
    },
    '/api/transactions/{id}': {
      put: {
        summary: 'Atualizar transação',
        tags: ['Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['income', 'expense'] },
                  description: { type: 'string', maxLength: 255 },
                  value: { type: 'number', minimum: 0 },
                  date: { type: 'string', format: 'date' },
                  category: { type: 'string' },
                  responsible: { type: 'string', maxLength: 100 },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Transação atualizada' }, 400: { description: 'Validação falhou' }, 404: { description: 'Transação não encontrada' } },
      },
      delete: {
        summary: 'Deletar transação',
        tags: ['Transactions'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Transação deletada' }, 404: { description: 'Transação não encontrada' } },
      },
    },
  },
};
