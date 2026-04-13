# Contributing to Stellar IoT

Thank you for your interest in contributing to Stellar IoT! This guide will help you get started.

## Getting Started

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
```bash
git clone https://github.com/YOUR_USERNAME/stellar-iot.git
cd stellar-iot
```

3. Add upstream remote:
```bash
git remote add upstream https://github.com/original/stellar-iot.git
```

### Branch Strategy

Create a new branch for your feature or bugfix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

## Development Workflow

### Frontend Development (apps/web)

```bash
cd apps/web
npm install
npm run dev
```

- Follow React/Next.js best practices
- Use TypeScript for type safety
- Follow TailwindCSS conventions
- Test your changes in the browser

### Backend Development (apps/api)

```bash
cd apps/api
cargo build
cargo run
cargo test
```

- Write idiomatic Rust code
- Add tests for new endpoints
- Use proper error handling
- Document API endpoints

### Smart Contract Development (contracts/iot)

```bash
cd contracts/iot
cargo build --target wasm32-unknown-unknown --release
cargo test
```

- Follow Soroban best practices
- Write comprehensive unit tests
- Document contract functions
- Consider gas optimization

## Commit Guidelines

Write clear, descriptive commit messages:

```
type(scope): brief description

Longer explanation if needed

Fixes #issue_number
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(frontend): add device filtering by category
fix(backend): resolve payment validation error
docs(readme): update setup instructions
```

## Pull Request Process

1. Update your branch with latest upstream changes:
```bash
git fetch upstream
git rebase upstream/main
```

2. Push your changes:
```bash
git push origin your-branch-name
```

3. Create a Pull Request on GitHub with:
   - Clear title and description
   - Reference related issues
   - Screenshots for UI changes
   - Test results

4. Wait for review and address feedback

5. Once approved, your PR will be merged!

## Code Style

### TypeScript/JavaScript
- Use ESLint and Prettier configurations
- Prefer functional components
- Use meaningful variable names

### Rust
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix warnings
- Follow Rust naming conventions

## Testing

Always add tests for new features:

- **Frontend**: React Testing Library
- **Backend**: Rust unit and integration tests
- **Contracts**: Soroban test framework

Run tests before submitting PR:
```bash
# Frontend
cd apps/web && npm test

# Backend
cd apps/api && cargo test

# Contracts
cd contracts/iot && cargo test
```

## Beginner-Friendly Contributions

New to open source? Start with these:

- Fix typos in documentation
- Improve error messages
- Add code comments
- Write tests for existing code
- Update README examples
- Create issues for bugs you find

Look for issues labeled `good-first-issue` or `help-wanted`.

## Questions?

- Open an issue for bugs or feature requests
- Join our community discussions
- Ask questions in pull request comments

## Code of Conduct

Be respectful, inclusive, and collaborative. We're all here to learn and build together.

Thank you for contributing to Stellar IoT! 🚀
