you can access the Swagger UI at:
http://localhost:5000/api-docs



Test the Health Check Endpoint
Start your server using npm start.
Open a browser or use a tool like Postman to hit the URL:
bash
Copy code
http://localhost:5000/health
You should receive a response similar to this:
json
Copy code
{
  "status": "UP",
  "timestamp": "2024-12-30T10:10:00.000Z",
  "uptime": 12345.678,
  "message": "Server is healthy"
}
