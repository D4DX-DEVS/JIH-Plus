# Database Migrations

This folder contains database migration scripts for the JIH Expansion project.

## Available Migrations

### 1. Update Alternative Submission Type: Gulf → Aged

**File:** `updateGulfToAged.js`

**Purpose:** Updates all existing alternative submissions with type 'Gulf' to 'Aged'

**When to run:** After deploying the code changes that updated the alternative submission enum

**How to run:**

```bash
# From the JIH-Expansion-Backend directory
node migrations/updateGulfToAged.js
```

**What it does:**
- Counts existing records with type 'Gulf'
- Updates all 'Gulf' records to 'Aged'
- Verifies the migration was successful
- Provides a detailed summary

**Safety:**
- Read-only check before making changes
- Atomic update operation
- Verification step after migration
- Detailed logging of all operations

## Best Practices

1. **Backup First**: Always backup your database before running migrations
2. **Test Environment**: Run migrations in a test environment first
3. **Check Logs**: Review the migration logs carefully
4. **Verify Results**: Manually verify a few records after migration
5. **Keep Scripts**: Don't delete migration scripts - they serve as documentation

## Migration Log

| Date | Migration | Status | Records Updated |
|------|-----------|--------|-----------------|
| TBD  | Gulf → Aged | Pending | TBD |

