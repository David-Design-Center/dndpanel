# Legacy Code & Technical Debt

This document tracks known issues in the Gmail integration that were built without official API documentation. **Do not copy patterns from these areas without verifying against current Gmail API docs via MCP.**

## Known Technical Debt

| File | Lines | Issue | Status |
|------|-------|-------|--------|
| `src/integrations/gapiService.ts` | ~3,100 | Monolithic orchestrator, mixed concerns, some deprecated patterns | Partially modularized into `gmail/` |
| `src/services/emailService.ts` | ~1,500 | Inconsistent caching, duplicate logic with gapiService | Stable but messy |
| `src/integrations/gmail/fetch/messages.ts` | ~540 | Query-based fetching mixed with labelIds approach | Partially fixed |
| `src/integrations/gmail/operations/labels.ts` | ~200 | Sequential API calls for label details, rate-limit prone | Works but slow |
| `src/contexts/LabelContext.tsx` | ~950 | Complex hydration logic, multiple refs tracking state | Functional but fragile |
| `src/components/email/EmailPageLayout.tsx` | ~2,000 | God component, too many responsibilities | Hooks extracted but still large |

## Patterns to Avoid (Verify via MCP First)

### 1. Query Strings for Label Filtering
**Legacy pattern** (found throughout codebase):
```typescript
// ❌ Unreliable for nested labels with special characters
const query = `label:"${labelName}"`;
```

**Preferred pattern** (verify current best practice via MCP):
```typescript
// ✅ Use labelIds parameter when available
const response = await threads.list({ userId: 'me', labelIds: [labelId] });
```

### 2. Manual Pagination Loops
Some code manually loops through pages. Check if Gmail API has better batch operations.

### 3. Draft ID vs Message ID Confusion
We track both because of past bugs. Verify if Gmail API has improved this.

### 4. Rate Limit Handling
Our `queueGmailRequest` was built through trial-and-error. Check official rate limit docs.

## Files Safe to Reference

These were built more recently with better patterns:
- `src/integrations/gmail/send/replyDrafts.ts` - Cleaner draft lifecycle
- `src/utils/requestQueue.ts` - Rate limit queue (though verify limits via MCP)
- `src/components/email labels/FoldersColumn.tsx` - Recent label navigation updates

## When Modifying Legacy Code

1. **Query MCP** for current Gmail API best practices
2. **Compare** with existing implementation
3. **Document** if existing code is wrong but working (don't refactor unless asked)
4. **Implement** new code using MCP-verified patterns
5. **Update this file** if you discover new debt

---

*This codebase has ~50k lines. Full refactoring isn't practical, but new code should follow verified patterns.*
