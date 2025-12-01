# Crystelf Core

Crystelf Core is a modern backend service built with NestJS that provides comprehensive API support for the Crystelf project. It integrates WebSocket communication, Redis caching, file management, and automatic updates.

## Core Features

### API Services
- **RESTful APIs**: Standardized API interfaces built on NestJS
- **Swagger Documentation**: Auto-generated API docs at `/docs`
- **Unified Response Format**: Standardized API response structure
- **Global Exception Handling**: Centralized error handling and logging

### Real-time Communication
- **WebSocket Support**: Real-time communication using `@nestjs/websockets`
- **Client Management**: Intelligent WebSocket client connection management
- **Message Routing**: Flexible message processing and distribution
- **Heartbeat Monitoring**: Automatic client connection status monitoring

### Data Management
- **Redis Integration**: High-performance caching and data storage
- **File System**: Local file management with CDN support
- **Data Persistence**: Local JSON file data storage
- **Automatic Sync**: Scheduled data updates

### Security & Monitoring
- **Token Authentication**: API access control via Bearer tokens
- **Request Rate Limiting**: IP-level request frequency control
- **Traffic Control**: Granular traffic monitoring and control
- **Logging**: Detailed request and error logs

## Architecture

### Technology Stack
- **Framework**: NestJS v11
- **Language**: TypeScript
- **Runtime**: Node.js
- **Package Manager**: pnpm

### Key Dependencies
- **WebSocket**: `@nestjs/websockets`, `ws`
- **Caching**: `ioredis`
- **Documentation**: `@nestjs/swagger`
- **File Processing**: `multer`, `stream-throttle`
- **Git Operations**: `simple-git`
- **Image Processing**: `image-type`

## Quick Start

### Prerequisites
- Node.js (v18+ recommended)
- Redis server
- pnpm package manager

### Installation
```bash
pnpm install
```

### Environment Setup
1. Copy the environment example file:
```bash
cp .envExample .env
```

2. Edit `.env` with your configuration:
```env
# Redis Configuration
RD_PORT=6379
RD_ADD=127.0.0.1

# WebSocket Secret
WS_SECRET=your-secret-key

# API Access Token
TOKEN=your-api-token

# OpenList API Configuration
OPENLIST_API_BASE_URL=http://127.0.0.1:5244
OPENLIST_API_BASE_USERNAME=username
OPENLIST_API_BASE_PASSWORD=password
OPENLIST_API_MEME_PATH=//crystelf//meme
OPENLIST_API_CDN_PATH=//crystelf//cdn
OPENLIST_API_BASE_PATH=D:\alist
```

### Start the Service
```bash
# Development mode
pnpm start:dev

# Production mode
pnpm start:prod

# Using startup script (auto-restart)
./start.sh
```

After startup:
- API Service: http://localhost:6868/api
- API Documentation: http://localhost:6868/docs

## API Endpoints

### Bot Management
- `POST /api/bot/getBotId` - Get online bot list
- `POST /api/bot/getGroupInfo` - Get group information
- `POST /api/bot/reportBots` - Broadcast bot status sync
- `POST /api/bot/sendMessage` - Send group message
- `POST /api/bot/broadcast` - Broadcast to all groups

### Text Management (Words)
- `POST /api/words/getText` - Get random text
- `POST /api/words/reloadText` - Reload specified text (auth required)
- `POST /api/words/listWords` - Get text list

### Meme Management
- `GET /api/meme` - Get random meme
- `POST /api/meme/get` - Get random meme
- `POST /api/meme/upload` - Upload meme (auth required)

### System Management
- `POST /api/system/systemRestart` - System restart (auth required)
- `POST /api/system/getRestartTime` - Get last restart duration (auth required)

### CDN Services
- `GET /cdn/*` - Access CDN resources
- `GET /public/files/*` - Access public files
- `GET /public/cdn/*` - Access public CDN resources

## Key Functionality

### Auto-Update System
- **Git Integration**: Automatically detects and pulls code updates
- **Dependency Management**: Auto-installs dependencies and builds
- **Scheduled Checks**: Configurable update checking intervals
- **Multi-Repository Support**: Handles main repo and submodules

### File Sync Service
- **OpenList Integration**: Seamless integration with OpenList service
- **Smart Comparison**: Intelligent local vs remote file comparison
- **Resume Support**: Large file transfer with resume capability
- **Directory Recursion**: Complete directory structure synchronization

### Traffic Control System
- **IP Rate Limiting**: Request frequency limits based on IP
- **Traffic Statistics**: Real-time usage statistics
- **Smart Throttling**: Intelligent speed limiting based on user permissions
- **Concurrency Control**: Connection limits to prevent resource abuse

### Data Caching
- **Redis Cache**: High-performance Redis caching system
- **Local Cache**: Fast in-memory caching
- **Cache Strategy**: Intelligent expiration and cleanup policies
- **Data Synchronization**: Local and Redis data sync mechanisms

## Security Features

### Authentication
- **Token Authentication**: Bearer token-based API authentication
- **WebSocket Authentication**: Secret key authentication for WebSocket connections
- **Access Control**: Fine-grained API permission control

### Security Protection
- **Path Validation**: Strict file path access verification
- **Input Filtering**: Comprehensive user input validation
- **Error Handling**: Secure error message responses
- **Audit Logging**: Complete operation logs

## Monitoring & Operations

### Logging System
- **Request Logs**: Detailed HTTP request access logs
- **Error Logs**: System errors and exception logs
- **Operation Logs**: Important system operation records
- **Performance Logs**: System performance metrics

### Health Checks
- **System Status**: Real-time system health monitoring
- **Dependency Checks**: External service health verification
- **Resource Monitoring**: System resource usage tracking

## Configuration

### Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| RD_PORT | Redis port | 6379 |
| RD_ADD | Redis address | 127.0.0.1 |
| WS_SECRET | WebSocket auth secret | - |
| TOKEN | API access token | - |
| OPENLIST_API_BASE_URL | OpenList API URL | http://127.0.0.1:5244 |
| OPENLIST_API_MEME_PATH | Meme remote path | //crystelf//meme |
| OPENLIST_API_CDN_PATH | CDN remote path | //crystelf//cdn |

### Directory Structure
- `logs/`: Log file storage
- `config/`: Configuration files
- `temp/`: Temporary files
- `private/data/`: User data storage
- `private/words/`: Text file storage
- `private/meme/`: Meme file storage
- `public/`: Public files and CDN resources

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [NestJS Documentation](https://docs.nestjs.com/)
- [Project Repository](https://github.com/your-repo/crystelf-core)
- [Issue Tracker](https://github.com/your-repo/crystelf-core/issues)

---

Crystelf Core provides stable and efficient backend support for the Crystelf project.