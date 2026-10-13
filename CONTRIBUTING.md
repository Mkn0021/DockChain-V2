# Contributing to DockChain V2

Thank you for contributing to DockChain V2!

## Ways to Contribute

- Report bugs
- Suggest features
- Improve documentation
- Submit pull requests

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Mkn0021/dockchain-v2.git
cd dockchain-v2
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Create a Branch

Use a descriptive branch name:

```bash
git checkout -b feat/api-wrapper
```

Common prefixes:

- `feat/` — New features
- `fix/` — Bug fixes
- `refactor/` — Code restructuring
- `docs/` — Documentation changes
- `test/` — Tests

### 4. Make Your Changes

Keep changes focused on a single feature. Follow the existing project structure and conventions.

### 5. Run Checks

```bash
bun run lint
bun run format
bun run typecheck
bun test
```

### 6. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/).

```bash
git add .
git commit -m "feat: add reusable API wrapper"
```

Common commit types:

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style changes
- `refactor:` — Code restructuring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

### 7. Push Your Branch

```bash
git push -u origin feat/api-wrapper
```

Submit a pull request when your changes are ready for review.

## Code Style

This project uses [Ultracite](https://github.com/haydenbleasel/ultracite) for linting and formatting.

```bash
# Check for issues
bun run lint

# Auto-fix formatting and lint issues
bun run format
```

Ensure your changes pass linting, formatting, type checking, and tests before merging.

## Testing

Add or update tests for new functionality and bug fixes. Test actual application behavior where practical, rather than relying exclusively on isolated mocks.

## Reporting Bugs

Include:

1. A clear description of the issue
2. Steps to reproduce
3. Expected versus actual behavior
4. Relevant environment details, including OS and Bun version

## Suggesting Features

1. Check existing issues first.
2. Describe the intended use case.
3. Explain the expected benefits.

## License

By contributing, you agree that your contributions will be licensed under the project's MIT License, subject to its existing terms.

---

Thank you for helping improve DockChain V2!
