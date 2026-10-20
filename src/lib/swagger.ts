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
    '/api/categories': {
      get: {
        summary: 'Listar categorias do usuário (cria os padrões na primeira chamada)',
        tags: ['Categories'],
        parameters: [{ name: 'type', in: 'query', schema: { type: 'string', enum: ['income', 'expense'] } }],
        responses: { 200: { description: 'Lista de categorias com transactionCount' }, 400: { description: 'Validação falhou' } },
      },
      post: {
        summary: 'Criar categoria',
        tags: ['Categories'],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 40 },
                  type: { type: 'string', enum: ['income', 'expense', 'both'] },
                  color: { type: 'string', example: '#22C55E' },
                  icon: { type: 'string', example: 'wallet' },
                },
                required: ['name', 'type'],
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoria criada' },
          400: { description: 'Validação falhou' },
          409: { description: 'Já existe categoria com esse nome (DUPLICATE)' },
          422: { description: 'Limite de 50 categorias (LIMIT)' },
        },
      },
    },
    '/api/categories/{id}': {
      patch: {
        summary: 'Editar categoria (renomear propaga para as transações)',
        tags: ['Categories'],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Categoria atualizada' },
          403: { description: 'Operação não permitida em "Outros" (FORBIDDEN)' },
          404: { description: 'Categoria não encontrada' },
          409: { description: 'Nome duplicado (DUPLICATE)' },
          422: { description: 'Tipo incompatível com transações existentes (INCOMPATIBLE_TYPE)' },
        },
      },
      delete: {
        summary: 'Excluir categoria (com transações exige reassignTo)',
        tags: ['Categories'],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'reassignTo', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Categoria excluída; retorna { success, moved }' },
          403: { description: 'Padrões não podem ser excluídos (FORBIDDEN)' },
          404: { description: 'Categoria não encontrada' },
          409: { description: 'Há transações: informe reassignTo (REASSIGN_REQUIRED)' },
          422: { description: 'Destino inválido ou incompatível (INVALID_REASSIGN)' },
        },
      },
    },
  },
};
