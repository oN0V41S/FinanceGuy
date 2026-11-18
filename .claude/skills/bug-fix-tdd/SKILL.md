---
name: bug-fix-tdd
description: Automated bug-fixing workflow using TDD. Use when the user reports a bug and wants a systematic fix: create an e2e test to replicate the error, implement the fix until the test passes, then delete the test after validation. Activates on keywords like bug, error, fix, broken, not working, replicate, reproduce.
---

# Bug Fix TDD Workflow

This skill automates the bug-fixing process using Test-Driven Development (TDD). The workflow creates a temporary e2e test that replicates the reported bug, implements the fix until the test passes, and deletes the test after user validation.
Make Analyse, of user prompt and understand the tasks, and EVER delegate sub-agents to token consume reduce.

## When to Use This Skill

- User reports a bug or error in the application
- User wants to replicate and fix a specific issue
- User asks to reproduce a broken feature
- Keywords: "bug", "error", "fix", "broken", "not working", "replicate", "reproduce"

## When NOT to Use This Skill

- Adding new features (use feature workflow instead)
- Refactoring without a specific bug report
- Performance optimization without a bug
- UI styling changes without functional issues

## Workflow Phases

### Phase 1: Bug Analysis
1. **Gather Information** – Ask the user to describe the bug in detail:
   - What is the expected behavior?
   - What is the actual behavior?
   - Steps to reproduce
   - Error messages (if any)
   - Screenshots or logs (if available)

2. **Identify Impact Area** – Determine which part of the codebase is affected:
   - Frontend component
   - Backend API route
   - Database query
   - Authentication flow
   - Business logic

### Phase 2: Create E2E Test to Replicate Bug
1. **Choose Testing Tool** – Use Playwright for e2e tests:
   - Frontend UI bugs → Playwright browser automation
   - API bugs → Playwright API testing or curl
   - Full-stack bugs → Playwright with server lifecycle

2. **Write Replication Test** – Create a test that:
   - Sets up the necessary state/data
   - Performs the user actions that trigger the bug
   - Asserts the buggy behavior (this test should FAIL initially)
   - Uses descriptive test name: `test('replicates bug: [description]')`

3. **Run Test to Confirm Bug** – Execute the test and verify it fails as expected:
   ```bash
   # For frontend/API tests
   python scripts/with_server.py --server "pnpm run dev" --port 3000 -- python test_script.py
   ```

### Phase 3: Implement Fix
1. **Analyze Root Cause** – Investigate why the bug occurs:
   - Check recent code changes
   - Review related tests
   - Examine error logs

2. **Implement Minimal Fix** – Make the smallest change that fixes the bug:
   - Follow Clean Architecture principles
   - Don't add unnecessary features
   - Keep changes focused on the bug

3. **Run Test to Verify Fix** – Execute the replication test:
   - Test should now PASS
   - If test still fails, iterate on the fix

### Phase 4: Validation and Cleanup
1. **User Validation** – Ask the user to:
   - Test the fix manually
   - Confirm the bug is resolved
   - Check for any side effects

2. **Delete Temporary Test** – Once validated, delete the e2e test file:
   ```bash
   rm <test_file_path>
   ```

3. **Commit Fix** – Create a commit with appropriate message:
   ```
   fix: [brief description of the bug fix]
   ```

## Tool Usage & Permissions

### Allowed Tools
- `read`, `write`, `edit` – For code modifications
- `glob`, `grep` – For finding relevant files
- `bash` – For running tests, server, and git commands
- `webfetch` – For fetching documentation if needed
- `playwright_*` – For browser automation and e2e testing

### Prohibited Actions
- Modifying production data
- Accessing external services without mocking
- Deleting files other than the temporary test
- Making commits without user validation

## Test Script Template

Create a temporary test file in `/tmp/bug_fix_test.py`:

```python
from playwright.sync_api import sync_playwright
import sys

def test_bug_replication():
    """Replicate the reported bug: [bug description]"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        try:
            # Navigate to the affected page
            page.goto('http://localhost:3000/[affected-route]')
            page.wait_for_load_state('networkidle')
            
            # Perform actions that trigger the bug
            # [Specific steps based on user's bug report]
            
            # Assert the buggy behavior (this should fail initially)
            # [Specific assertions based on expected vs actual behavior]
            
            print("✅ Bug replicated - test failed as expected")
            return True
            
        except Exception as e:
            print(f"❌ Test failed: {e}")
            return False
            
        finally:
            browser.close()

if __name__ == '__main__':
    success = test_bug_replication()
    sys.exit(0 if not success else 1)  # Exit 1 = bug replicated (test failed as expected)
```

## Execution Guidelines

1. **Always ask for bug details first** – Don't assume the bug without user confirmation
2. **Use Playwright for e2e tests** – Native Python scripts, not Jest for browser bugs
3. **Run tests with with_server.py** – Manage server lifecycle properly
4. **Keep fixes minimal** – Don't refactor unrelated code
5. **Delete temporary tests** – Never commit replication tests
6. **Validate with user** – Always confirm fix before cleanup

## Quality Checks

Before completing the workflow:
- [ ] Bug was successfully replicated with e2e test
- [ ] Test fails initially (confirming bug exists)
- [ ] Fix implemented following Clean Architecture
- [ ] Test passes after fix
- [ ] User validated the fix
- [ ] Temporary test deleted
- [ ] No regressions in existing tests (`pnpm test`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Commit created with proper message

## Example Usage

**User**: "The login form doesn't show error messages when I enter wrong credentials"

**Workflow**:
1. Create e2e test that attempts login with wrong credentials and checks for error message
2. Run test → fails (no error message shown)
3. Investigate login component and auth service
4. Fix the error handling logic
5. Run test → passes (error message now shown)
6. User validates fix works
7. Delete temporary test
8. Commit: `fix: show error messages on invalid login credentials`
