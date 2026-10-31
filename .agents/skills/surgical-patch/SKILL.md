# surgical-patch

Fix bugs and small behavior changes at the narrowest responsible layer. Use when regression proof, preserved surrounding behavior, and task-relevant tests matter.

## When to Use
- Bug fixes
- Small behavior changes
- Narrowest responsible layer
- Regression proof needed
- Surrounding behavior preserved

## Principles
1. **Minimal Change** - Fix at narrowest layer
2. **Regression Proof** - Ensure no side effects
3. **Preserve Context** - Keep surrounding behavior
4. **Test Coverage** - Include relevant tests
5. **Document Fix** - Record root cause and solution

## Workflow
1. **Identify** - Find root cause
2. **Isolate** - Narrow to responsible layer
3. **Fix** - Apply minimal change
4. **Test** - Verify fix and no regressions
5. **Document** - Record fix details