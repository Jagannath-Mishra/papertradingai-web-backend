const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Virtual Stock Trading API",
      version: "1.0.0",
      description: "API documentation for the Virtual Stock Trading application",
    },
    servers: [
      {
        url: "http://localhost:5000/api", // Base URL of your API
        description: "Development server",
      },
    ],
  },
  apis: ["./routes/*.js"], // Path to the API route files
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
