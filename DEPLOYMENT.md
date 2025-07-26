# Printer Dashboard Deployment Guide

## Portainer Stack Deployment

### Prerequisites
- Portainer installed and running
- Access to the `postgres-database_default` network
- Supabase project credentials

### Environment Variables
Before deploying, ensure you have the following environment variables:

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Option 1: Deploy via Portainer Stacks

1. **Login to Portainer**
2. **Navigate to Stacks**
3. **Click "Add Stack"**
4. **Choose "Web editor"**
5. **Copy the contents of `portainer-stack.yml`**
6. **Set Environment Variables:**
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key
7. **Deploy the stack**

### Option 2: Build and Deploy Custom Image

1. **Build the Docker image:**
   ```bash
   docker build -t printer-dashboard:latest .
   ```

2. **Use the built image in Portainer:**
   - Update the `portainer-stack.yml` to use your custom image
   - Deploy via Portainer Stacks

### Option 3: Docker Compose

If you prefer using Docker Compose directly:

```bash
# Set environment variables
export VITE_SUPABASE_URL="your-supabase-url"
export VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"

# Deploy
docker-compose up -d
```

### Access

The dashboard will be available at:
- **URL**: `http://your-server-ip:3000`
- **Port**: 3000

### Health Check

The application includes a health check endpoint:
- **URL**: `http://your-server-ip:3000/health`

### Network Configuration

The service connects to the `postgres-database_default` network, allowing it to communicate with other services in that network if needed.

### Resource Limits

The Portainer stack includes resource limits:
- **CPU**: 0.5 cores max, 0.1 cores reserved
- **Memory**: 512MB max, 128MB reserved

### Troubleshooting

1. **Container won't start:**
   - Check environment variables are set correctly
   - Verify the `postgres-database_default` network exists
   - Check container logs in Portainer

2. **Cannot access dashboard:**
   - Ensure port 3000 is not blocked by firewall
   - Check if another service is using port 3000
   - Verify container is running and healthy

3. **Supabase connection issues:**
   - Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
   - Check Supabase project is accessible from your network
   - Review browser developer tools for errors

### Security Notes

- The dashboard runs as a static web application served by nginx
- All API calls are made directly from the browser to Supabase
- Ensure your Supabase Row Level Security (RLS) policies are properly configured
- Consider setting up HTTPS for production deployments