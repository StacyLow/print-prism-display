
# Docker Deployment Guide

## Prerequisites
- Docker and Docker Compose installed
- Existing PostgreSQL database
- Portainer (optional but recommended)

## Quick Start

### 1. Environment Variables
Set these environment variables in Portainer or create a `.env` file:

```env
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=printer_dashboard
DB_USER=postgres
DB_PASSWORD=your-password
DB_SSL=false
```

### 2. Deploy with Docker Compose

#### Option A: Basic deployment (app only)
```bash
docker-compose up -d
```

#### Option B: With Nginx reverse proxy
```bash
docker-compose --profile nginx up -d
```

### 3. Deploy from Portainer

1. Go to Stacks → Add Stack
2. Choose "Repository" method
3. Enter your GitHub repository URL
4. Set the compose file path: `docker-compose.yml`
5. Add environment variables in the "Environment variables" section
6. Click "Deploy the stack"

## Configuration

### Database Connection
The application will connect to your existing PostgreSQL database using the provided environment variables. Make sure your PostgreSQL instance is accessible from the Docker container.

### Network Access
If your PostgreSQL is on the same Docker network, use the service name as hostname. If it's on the host machine, use `host.docker.internal` (Docker Desktop) or the host IP address.

### Health Checks
The application includes health checks to ensure it's running properly. Check the container logs if health checks fail.

### SSL/TLS
For production, consider:
- Using the Nginx service for SSL termination
- Placing SSL certificates in the `./ssl` directory
- Configuring your domain and SSL settings in `nginx.conf`

## Troubleshooting

### Common Issues
1. **Database connection failed**: Check environment variables and network connectivity
2. **Health check failing**: Verify the application is starting correctly
3. **Port conflicts**: Change the port mapping in docker-compose.yml

### Logs
```bash
docker-compose logs -f app
docker-compose logs -f nginx  # if using nginx
```

### Scaling
To run multiple instances:
```bash
docker-compose up -d --scale app=3
```

## Security Considerations
- Use strong database passwords
- Enable SSL for database connections in production
- Configure proper firewall rules
- Consider using secrets management for sensitive data
- Regularly update Docker images
