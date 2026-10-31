# lean-build

Build feature work with high overbuilding risk. Use for new behavior, product slices, or integrations where repository reuse, strict scope, and an explicit stop condition matter.

## When to Use
- New behavior or features
- Product slices
- Integrations
- Repository reuse needed
- Strict scope required
- Explicit stop condition needed

## Principles
1. **Minimal Scope** - Build only what's needed
2. **Repository Reuse** - Leverage existing code
3. **Strict Boundaries** - Clear scope limits
4. **Stop Condition** - Explicit completion criteria
5. **Value First** - Prioritize user value

## Workflow
1. **Scope** - Define minimal viable feature
2. **Audit** - Check existing code for reuse
3. **Build** - Implement with strict boundaries
4. **Verify** - Test against stop condition
5. **Ship** - Deliver when stop condition met