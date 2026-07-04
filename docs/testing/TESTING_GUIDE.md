# Testing Guide

## Overview

GitHired uses a comprehensive testing strategy covering unit tests, integration tests, E2E tests, LLM accuracy tests, performance tests, and security tests.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Structure](#test-structure)
5. [Best Practices](#best-practices)
6. [CI/CD Integration](#cicd-integration)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (for integration tests)
- Playwright browsers (for E2E tests)

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run playwright:install
```

### Environment Setup

Create a `.env.test` file for test-specific environment variables:

```env
TEST_DATABASE_URL=postgresql://user:password@localhost:5432/githired_test
GEMINI_API_KEY=your_test_api_key
```

## Running Tests

### All Tests

```bash
npm test                 # Run all unit and integration tests
npm run test:all         # Run all tests including E2E
```

### By Type

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # End-to-end tests
npm run test:llm         # LLM accuracy tests
npm run test:security    # Security tests
npm run test:performance # Performance/load tests
```

### With Coverage

```bash
npm run test:coverage    # Run tests with coverage report
```

### Watch Mode

```bash
npm run test:watch       # Run tests in watch mode
```

### Specific Test Files

```bash
# Run a specific test file
npm test -- tests/unit/ai/llm-provider.test.ts

# Run tests matching a pattern
npm test -- --testPathPattern=ai
```

## Writing Tests

### Unit Tests

Unit tests test individual functions and components in isolation.

**Location**: `tests/unit/`

**Example**:

```typescript
import { describe, it, expect } from '@jest/globals';
import { validateEmail } from '@/lib/helpers';

describe('Email Validation', () => {
  it('should validate correct email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should reject invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### Integration Tests

Integration tests test how multiple components work together.

**Location**: `tests/integration/`

**Example**:

```typescript
describe('Student API Integration', () => {
  it('should complete signup and profile creation', async () => {
    const signupResponse = await api.post('/auth/signup', userData);
    expect(signupResponse.success).toBe(true);

    const profileResponse = await api.post('/student/profile', profileData);
    expect(profileResponse.success).toBe(true);
  });
});
```

### E2E Tests

E2E tests test complete user flows in a real browser.

**Location**: `tests/e2e/`

**Example**:

```typescript
import { test, expect } from '@playwright/test';

test('should complete job application', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'student@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');

  await page.click('text=Jobs');
  await page.click('.job-card:first-child');
  await page.click('text=Apply Now');

  await expect(page.locator('text=Application submitted')).toBeVisible();
});
```

### LLM Accuracy Tests

Test the accuracy of LLM-generated responses.

**Location**: `tests/llm-accuracy/`

**Example**:

```typescript
describe('SQL Generation Accuracy', () => {
  it('should generate correct SQL', async () => {
    const query = 'How many jobs are there?';
    const sql = await generateSQL(query);
    expect(sql).toContain('SELECT COUNT(*) FROM jobs');
  });
});
```

## Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── ai/           # AI module tests
│   ├── server/       # Server action tests
│   └── lib/          # Library utility tests
├── integration/       # Integration tests
│   ├── api/          # API integration tests
│   ├── db/           # Database tests
│   └── ai/           # AI pipeline tests
├── e2e/              # End-to-end tests
│   ├── auth.spec.ts
│   └── ...
├── llm-accuracy/     # LLM accuracy tests
├── performance/      # Performance tests
├── security/         # Security tests
├── fixtures/         # Test data
└── utils/            # Test utilities
```

## Best Practices

### General

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Assertion**: Focus on one thing per test
4. **Independence**: Tests should not depend on each other
5. **Fast**: Keep unit tests fast (<100ms)

### Mocking

```typescript
// Mock external dependencies
jest.mock('@/lib/ai/llm-provider');

// Mock implementation
const mockGenerateSQL = jest.fn().mockResolvedValue('SELECT * FROM jobs');
```

### Test Data

Use fixtures for consistent test data:

```typescript
import { studentFixture, jobFixture } from '@/tests/fixtures';

it('should apply to job', () => {
  const student = studentFixture();
  const job = jobFixture();
  // ... test logic
});
```

### Cleanup

Always clean up after tests:

```typescript
afterEach(async () => {
  await cleanupDatabase();
  jest.clearAllMocks();
});
```

## Coverage Goals

- **Overall**: 80%+ coverage
- **Critical paths**: 100% coverage
- **New code**: 90%+ coverage

### Checking Coverage

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Debugging Tests

### Jest

```bash
# Run with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Add breakpoints in VSCode
# Set breakpoint in test file
# Run "Debug Jest Tests" configuration
```

### Playwright

```bash
# Run in headed mode
npm run test:e2e:headed

# Run with Playwright Inspector
npm run test:e2e -- --debug

# Open Playwright UI
npm run test:e2e:ui
```

## CI/CD Integration

Tests run automatically on:
- Every push to main/develop
- Every pull request
- Nightly (for LLM accuracy tests)

### GitHub Actions

See `.github/workflows/test.yml` for full configuration.

### Quality Gates

- All tests must pass
- Coverage must be >70%
- No critical security vulnerabilities
- Performance benchmarks met

## Troubleshooting

### Common Issues

**Issue**: Tests timing out
**Solution**: Increase timeout in jest.config.js or use `jest.setTimeout(10000)`

**Issue**: Database connection errors
**Solution**: Ensure PostgreSQL is running and TEST_DATABASE_URL is correct

**Issue**: E2E tests failing on CI
**Solution**: Check Playwright browser installation and viewport settings

**Issue**: Flaky tests
**Solution**: Identify and fix race conditions, add proper waits

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [Artillery Documentation](https://artillery.io/)

## Support

For testing questions, please:
1. Check this guide
2. Review test examples in the codebase
3. Open an issue on GitHub
4. Contact the development team

