const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Ocula Server API',
    version: '1.0.0',
    description: 'Backend API for Ocula face detection, authentication, and user stats.'
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    '/': {
      get: {
        summary: 'Health check',
        responses: {
          200: {
            description: 'Backend is available'
          }
        }
      }
    },
    '/signin': {
      post: {
        summary: 'Sign in and receive a JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Signed in successfully'
          }
        }
      }
    },
    '/register': {
      post: {
        summary: 'Create a new user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'User created successfully'
          }
        }
      }
    },
    '/profile/{id}': {
      get: {
        summary: 'Get a user profile',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: {
            description: 'Profile returned'
          },
          401: {
            description: 'Token missing or invalid'
          },
          403: {
            description: 'User is not allowed to read another profile'
          }
        }
      }
    },
    '/image': {
      put: {
        summary: 'Increment the signed-in user entry count',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['id'],
                properties: {
                  id: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Updated entry count'
          }
        }
      }
    },
    '/admin/users': {
      get: {
        summary: 'Admin-only example route to list users',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User list returned'
          },
          403: {
            description: 'Only admins can access this route'
          }
        }
      }
    },
    '/admin/users/{id}': {
      delete: {
        summary: 'Admin-only route to completely delete a user',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          200: {
            description: 'User deleted successfully'
          },
          400: {
            description: 'Admin tried to delete the currently signed-in account'
          },
          404: {
            description: 'User not found'
          },
          403: {
            description: 'Only admins can access this route'
          }
        }
      }
    }
  }
};

module.exports = {
  openApiDocument
};
