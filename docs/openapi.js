// This object describes the backend API using the OpenAPI standard.
// Swagger UI reads it and creates the interactive documentation at /docs.
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
      // bearerAuth means protected requests must send:
      // Authorization: Bearer <jwt-token>
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  paths: {
    // Each key below is one backend URL. The nested get/post/put/delete object
    // explains what HTTP method that URL supports.
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
        summary: 'Create a new user account and send verification email',
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
            description: 'User created; verification email sent or logged in development'
          }
        }
      }
    },
    '/verify-email': {
      post: {
        summary: 'Verify an email address using the emailed token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'token'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  token: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Email verified; JWT token returned' },
          400: { description: 'Invalid or expired verification link' }
        }
      }
    },
    '/resend-verification': {
      post: {
        summary: 'Send a new verification email',
        responses: {
          200: { description: 'Verification email sent when needed' }
        }
      }
    },
    '/forgot-password': {
      post: {
        summary: 'Start password reset flow',
        responses: {
          200: { description: 'Generic reset response returned' }
        }
      }
    },
    '/reset-password': {
      post: {
        summary: 'Reset password using emailed token',
        responses: {
          200: { description: 'Password reset successfully' },
          400: { description: 'Invalid or expired reset link' }
        }
      }
    },
    '/auth/google': {
      post: {
        summary: 'Sign in or register with a verified Google ID token',
        responses: {
          200: { description: 'JWT token and user returned' },
          400: { description: 'Google token could not be verified' }
        }
      }
    },
    '/profile/{id}': {
      get: {
        summary: 'Get a user profile',
        // security tells Swagger this route needs a JWT token.
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
        // The backend uses the token to make sure users can only update allowed accounts.
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
        summary: 'Permission-protected route to list users',
        // This route requires the view_users permission in app.js.
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
        summary: 'Permission-protected route to completely delete a user',
        // The {id} part in the path becomes req.params.id in Express.
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
