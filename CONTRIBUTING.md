# Contributing to PixiDen

Thank you for your interest in contributing to PixiDen! 🎮

## Development Setup

### Prerequisites

- Go 1.21+
- Node.js 18+
- Rust (for Tauri)
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/pixiden.git
   cd pixiden
   ```

3. Install dependencies:
   ```bash
   # Backend
   cd backend
   go mod download
   
   # Frontend
   cd ../frontend
   npm install
   ```

4. Create a branch:
   ```bash
   git checkout -b feature/my-awesome-feature
   ```

## Project Structure

```
pixiden/
├── backend/          # Go backend daemon
│   ├── cmd/         # Entry points
│   ├── internal/    # Private packages
│   └── pkg/         # Public packages
├── frontend/         # Tauri + Vue.js frontend
│   ├── src/         # Vue.js source
│   └── src-tauri/   # Rust/Tauri backend
└── docs/            # Documentation
```

## Code Style

### Go
- Use `gofmt` for formatting
- Run `golangci-lint run` before committing
- Write tests for new features

### TypeScript/Vue
- Use ESLint + Prettier
- Follow Vue 3 Composition API patterns
- Write component tests when possible

### Rust
- Use `rustfmt`
- Follow Tauri best practices

## Testing

### Backend Tests
```bash
cd backend
go test -v ./...
```

### Frontend Tests
```bash
cd frontend
npm run test
```

## Commit Guidelines

We use conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Example:
```
feat: add GOG store adapter
fix: resolve Wine prefix creation issue
docs: update installation guide
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Update CHANGELOG.md
5. Submit PR with clear description

## Areas Needing Help

- [ ] Steam integration
- [ ] Metadata providers (IGDB, SteamGridDB)
- [ ] Download manager improvements
- [ ] Controller support enhancements
- [ ] Theme system
- [ ] Documentation

## Questions?

Open an issue or discussion on GitHub!
