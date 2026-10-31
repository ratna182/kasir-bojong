# safe-refactor

Restructure code while preserving behavior. Use for extraction, consolidation, ownership moves, or cleanup where verification must bracket structural edits.

## When to Use
- Code extraction
- Code consolidation
- Ownership moves
- Code cleanup
- Structural edits

## Principles
1. **Preserve Behavior** - Maintain identical functionality
2. **Verify Before/After** - Test before and after changes
3. **Small Steps** - Make incremental changes
4. **Rollback Ready** - Always have rollback path
5. **Document Changes** - Record what changed and why

## Workflow
1. **Verify** - Test current behavior
2. **Plan** - Design refactoring steps
3. **Execute** - Make incremental changes
4. **Test** - Verify behavior preserved
5. **Document** - Record changes