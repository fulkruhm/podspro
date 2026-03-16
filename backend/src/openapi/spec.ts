export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'PODS Backend API',
    version: '1.0.0',
    description: 'OpenAPI contract for PODS backend service',
  },
  servers: [
    { url: '/api', description: 'Current API' },
    { url: '/api/v1', description: 'Versioned API' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'PODSJWT',
        description: 'Signed bearer token issued by POST /auth/login',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          requestId: { type: 'string' },
        },
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          service: { type: 'string' },
          environment: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          uptimeSeconds: { type: 'integer' },
        },
        required: ['status', 'service', 'timestamp'],
      },
      ReadyResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ready', 'not_ready'] },
          dependencies: {
            type: 'object',
            properties: {
              database: { type: 'string' },
              mlService: { type: 'string' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
        },
        required: ['status', 'dependencies', 'timestamp'],
      },
      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' },
        },
      },
      MlForecastRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['historical_demand'],
        properties: {
          product_id: { type: 'string' },
          store_id: { type: 'string' },
          historical_demand: {
            type: 'array',
            minItems: 3,
            items: { type: 'number' },
          },
          forecast_days: { type: 'integer', minimum: 1, maximum: 90, default: 7 },
          persist: { type: 'boolean' },
        },
      },
      MlAnomalyRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['datapoints'],
        properties: {
          datapoints: {
            type: 'array',
            minItems: 1,
            items: { type: 'object', additionalProperties: true },
          },
          sensitivity: { type: 'number', minimum: 0.001, maximum: 0.5 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Backend liveness',
        responses: {
          '200': {
            description: 'Service is alive',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
        },
      },
    },
    '/ready': {
      get: {
        summary: 'Backend readiness including dependencies',
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadyResponse' },
              },
            },
          },
          '503': {
            description: 'Service dependencies are not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ReadyResponse' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Authenticate user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated and token issued' },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Account inactive or locked' },
        },
      },
    },
    '/auth/validate': {
      get: {
        summary: 'Validate bearer token and return user identity',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Token valid' },
          '401': { description: 'Token missing/invalid' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate refresh token and issue a new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session refreshed and tokens rotated' },
          '401': { description: 'Invalid or revoked refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Revoke current access token and optional refresh token',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                additionalProperties: false,
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session revoked' },
          '401': { description: 'Missing/invalid access token' },
        },
      },
    },
    '/ml/anomalies/detect': {
      post: {
        summary: 'Detect anomalies via ML service',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MlAnomalyRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Anomaly results' },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'ML service unavailable' },
        },
      },
    },
    '/ml/forecast': {
      post: {
        summary: 'Generate demand forecast',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MlForecastRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Forecast result' },
          '400': { description: 'Validation error' },
          '503': { description: 'ML service unavailable' },
        },
      },
    },
    '/users': {
      get: {
        summary: 'List users (sysadmin only)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'User list' },
          '401': { description: 'Auth required' },
          '403': { description: 'Insufficient permissions' },
        },
      },
    },
    '/audit/logs': {
      get: {
        summary: 'List audit logs (admin/sysadmin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Audit log list' },
          '401': { description: 'Auth required' },
          '403': { description: 'Insufficient permissions' },
        },
      },
      post: {
        summary: 'Create audit log event (admin/sysadmin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '201': { description: 'Audit log created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Auth required' },
          '403': { description: 'Insufficient permissions' },
        },
      },
    },
    '/audit/export': {
      get: {
        summary: 'Export audit logs as CSV (admin/sysadmin)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'CSV file download' },
          '401': { description: 'Auth required' },
          '403': { description: 'Insufficient permissions' },
        },
      },
    },
  },
} as const;
