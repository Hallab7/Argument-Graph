import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Argument Graph API',
      version: '1.0.0',
      description: 'API for the Argument Graph application - a platform for structured debates and argument analysis',
      contact: {
        name: 'API Support',
        email: 'support@argumentgraph.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            username: {
              type: 'string',
              description: 'Unique username'
            },
            avatar_url: {
              type: 'string',
              nullable: true,
              description: 'User avatar image URL'
            },
            reputation: {
              type: 'number',
              default: 100,
              description: 'User reputation score'
            },
            verified: {
              type: 'boolean',
              default: false,
              description: 'Email verification status'
            },
            role: {
              type: 'string',
              enum: ['user', 'moderator', 'admin'],
              description: 'User role'
            },
            isActive: {
              type: 'boolean',
              description: 'Account active status'
            },
            lastLogin: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              description: 'Last login timestamp'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'username', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'Unique username'
            },
            password: {
              type: 'string',
              minLength: 6,
              description: 'User password'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address'
            },
            password: {
              type: 'string',
              description: 'User password'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: {
              type: 'string',
              description: 'JWT access token'
            }
          }
        },
        UpdateProfileRequest: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              description: 'New username (optional)'
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Current password'
            },
            newPassword: {
              type: 'string',
              minLength: 8,
              description: 'New password (min 8 chars, must contain uppercase, lowercase, and number)'
            }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                },
                token: {
                  type: 'string',
                  description: 'JWT access token (expires in 24h)'
                },
                refreshToken: {
                  type: 'string',
                  description: 'JWT refresh token (expires in 7 days)'
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        UserResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'User profile retrieved successfully'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User'
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            },
            data: {
              type: 'object',
              nullable: true
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Error message'
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string'
                      },
                      message: {
                        type: 'string'
                      },
                      code: {
                        type: 'string'
                      }
                    }
                  },
                  description: 'Validation error details (optional)'
                }
              }
            },
            meta: {
              type: 'object',
              properties: {
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                },
                path: {
                  type: 'string'
                },
                method: {
                  type: 'string'
                }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.js']
};

const specs = swaggerJsdoc(options);

export { swaggerUi, specs };