# migration

Implement reversible compatibility-safe transitions. Use for schema, data, API, protocol, configuration, or dependency migrations requiring rollback and preservation proof.

## When to Use
- Schema migrations
- Data migrations
- API transitions
- Protocol changes
- Configuration updates
- Dependency upgrades

## Principles
1. **Reversibility** - Always provide rollback path
2. **Compatibility** - Maintain backward compatibility
3. **Preservation** - Preserve existing data/state
4. **Testing** - Test migration and rollback
5. **Documentation** - Document migration steps

## Workflow
1. **Plan** - Design migration with rollback
2. **Test** - Test in staging environment
3. **Execute** - Run migration with monitoring
4. **Verify** - Validate migration success
5. **Document** - Update documentation