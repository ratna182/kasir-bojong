# caveman-manage

Inspect Caveman Cloud's experiment lifecycle and block unsafe execution. Use when asked to start, approve, cancel, promote or roll back a Caveman experiment.

## When to Use
- Starting experiments
- Approving experiments
- Cancelling experiments
- Promoting experiments
- Rolling back experiments

## Experiment Lifecycle
1. **Draft** - Experiment created
2. **Review** - Experiment reviewed
3. **Approved** - Experiment approved
4. **Running** - Experiment executing
5. **Completed** - Experiment finished
6. **Promoted** - Experiment promoted to production
7. **Rolled Back** - Experiment reverted

## Safety Checks
- Validate experiment configuration
- Check resource limits
- Verify rollback capability
- Monitor execution progress