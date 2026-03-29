#!/bin/bash

# Chat Performance Test Runner
# Runs performance integration tests with proper environment setup

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║      Chat Performance Integration Test Runner              ║"
echo "║                  Phase 7, Task 6                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if TEST_AUTH_TOKEN is set
if [ -z "$TEST_AUTH_TOKEN" ]; then
  echo "⚠️  Warning: TEST_AUTH_TOKEN environment variable not set"
  echo ""
  echo "To get a test token:"
  echo "  1. Log in to the app at http://localhost:5173"
  echo "  2. Open DevTools Console and run:"
  echo "     const { data } = await supabase.auth.getSession()"
  echo "     console.log(data.session.access_token)"
  echo "  3. Set the token:"
  echo "     export TEST_AUTH_TOKEN='your-token-here'"
  echo ""
  echo "Or skip token validation with:"
  echo "     npm test -- tests/chat-performance.spec.js -- --grep '@'  # Run all tests"
  echo ""
  read -p "Continue without token? [y/N] " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Check VITE_SUPABASE_URL
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "⚠️  Warning: VITE_SUPABASE_URL not set, using default"
  echo "   If tests fail to reach API, set:"
  echo "     export VITE_SUPABASE_URL='https://your-project.supabase.co'"
  echo ""
fi

# Verify Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Error: Node.js 18+ required (found v$(node -v))"
  exit 1
fi

echo "✓ Environment Verified"
echo "  Node.js: $(node -v)"
echo "  Playwright: $(npm list @playwright/test 2>/dev/null | grep '@playwright/test' | awk '{print $NF}' || echo 'installed')"
echo ""

# List available tests
echo "📋 Available Test Suites:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm test -- --list tests/chat-performance.spec.js 2>&1 | grep -E "›|Total" | head -15
echo ""

# Determine which tests to run
if [ -z "$1" ]; then
  TESTS="tests/chat-performance.spec.js"
  TEST_DESC="all performance tests"
else
  TESTS="tests/chat-performance.spec.js"
  GREP="$1"
  TEST_DESC="tests matching: $GREP"
fi

echo "🚀 Running: $TEST_DESC"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run tests
if [ -z "$GREP" ]; then
  npm test -- "$TESTS" --reporter=list
else
  npm test -- "$TESTS" --grep "$GREP" --reporter=list
fi

TEST_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Performance Tests Completed Successfully!"
  echo ""
  echo "📊 Results:"
  echo "   • Test Report: playwright-report/index.html"
  echo "   • JSON Results: test-results.json"
  echo ""
  echo "Next steps:"
  echo "   1. Review performance metrics in console output above"
  echo "   2. Verify TTFT < 1000ms (streaming advantage)"
  echo "   3. Check for any errors or timeouts"
  echo "   4. Review HTML report: open playwright-report/index.html"
else
  echo "❌ Performance Tests Failed!"
  echo ""
  echo "Troubleshooting:"
  echo "   1. Check TEST_AUTH_TOKEN is valid"
  echo "   2. Verify VITE_SUPABASE_URL is correct"
  echo "   3. Ensure Edge Function is deployed"
  echo "   4. Check network connectivity"
  echo "   5. Review error messages above"
  echo ""
  echo "For more details, run with debug mode:"
  echo "   npm run test:debug -- tests/chat-performance.spec.js"
fi

exit $TEST_EXIT
