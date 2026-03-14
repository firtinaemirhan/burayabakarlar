# Scenario Pre-generation Design

**Date:** 2026-03-14
**Project:** Crowd Whisper Roar
**Goal:** Eliminate loading delays during scenario transitions by pre-generating images for upcoming scenarios

---

## Problem Statement

**Current Flow:**
1. User count changes (e.g., 1 → 2)
2. Scenario transitions (Whisper → Rival)
3. `useIPhoneAd(2)` hook triggers image generation
4. 5-10 second wait for Wiro API
5. User sees loading screen

**Goal:** Pre-generate next scenario's image **before** transition, so when user count crosses threshold, image is ready instantly.

---

## Design Overview

### Architecture

```
Index.tsx (tracks current scenario)
  ↓
useScenarioPregeneration(scenario) [NEW]
  ├→ calculates next scenario
  └→ background generation if needed
       ├→ submitImageTask()
       └→ pollTask()
  ↓
imageCache (global, shared)
  ↑
useIPhoneAd(scenario) [UNCHANGED]
  ↓
  Component displays cached image instantly
```

### Core Principle

- **Eager pre-generation:** Start generating next scenario's image as soon as current scenario renders
- **Deduplication:** Never generate the same scenario twice simultaneously
- **Silent failures:** Pre-generation errors don't block UI (user sees loading screen if they transition before complete)
- **Reuse existing cache:** Leverage `useIPhoneAd`'s global `imageCache` object

---

## Scenario Transitions

```typescript
Scenario 1 (Whisper)
  → pre-generate Scenario 2 (Rival)
  ↓ (count crosses 2)
Scenario 2 (Rival)
  → pre-generate Scenario 3 (Dictator)
  ↓ (count crosses 7)
Scenario 3 (Dictator)
  → pre-generate nothing (rare to go back, Rival already cached)
```

---

## Implementation Details

### New Hook: `useScenarioPregeneration`

**File:** `src/hooks/useScenarioPregeneration.ts` (new file)

**Signature:**
```typescript
export function useScenarioPregeneration(currentScenario: 1 | 2 | 3): void
```

**Responsibilities:**
1. Calculate next scenario from current
2. Check if next scenario already cached
3. If not cached: initiate background generation
4. Track in-progress generations to prevent duplicates
5. Silently handle errors

**State Management:**
- Use `useRef` to track which scenario is currently pre-generating
- If `useScenarioPregeneration(2)` called twice, skip second call if already generating scenario 3
- On success: add to `imageCache`
- On error: do nothing (let user see loading screen later if needed)

**Polling:**
- Same polling mechanism as `useIPhoneAd`: check every 2 seconds
- Continue polling until success or abandonment
- No timeout—polling continues in background indefinitely

### Integration in Index.tsx

**File:** `src/pages/Index.tsx` (minimal change)

**Current:**
```typescript
const Index = () => {
  const { count } = useRealSessionCount();
  const scenario = useMemo(() => getScenario(count), [count]);
  return (
    <AnimatePresence mode="wait">
      {scenario === 1 && <ScenarioWhisper />}
      {scenario === 2 && <ScenarioRival count={count} />}
      {scenario === 3 && <ScenarioDictator count={count} />}
    </AnimatePresence>
  );
};
```

**Updated:**
```typescript
const Index = () => {
  const { count } = useRealSessionCount();
  const scenario = useMemo(() => getScenario(count), [count]);

  // NEW: trigger pre-generation
  useScenarioPregeneration(scenario);

  return (
    <AnimatePresence mode="wait">
      {scenario === 1 && <ScenarioWhisper />}
      {scenario === 2 && <ScenarioRival count={count} />}
      {scenario === 3 && <ScenarioDictator count={count} />}
    </AnimatePresence>
  );
};
```

### Existing Code: No Changes

- `useIPhoneAd.ts`: Unchanged. Still reads from `imageCache`, still uses same PROMPTS
- `ScenarioRival.tsx`, `ScenarioDictator.tsx`: Unchanged. Still use `useIPhoneAd(2)` and `useIPhoneAd(3)`
- `wiro.ts`: Unchanged. API layer stays the same

---

## Error Handling

### Pre-generation Failures

**Scenario:** Wiro API fails during background generation

**Behavior:**
1. Error caught silently (no console.error, just console.warn if dev mode)
2. Cache entry NOT created
3. `imageCache[nextScenario]` remains undefined

**Result:** If user transitions to that scenario before pre-generation retries, `useIPhoneAd` will:
- Detect cache miss
- Start fresh generation
- Show loading screen (normal UX)

### Polling Loop Abandonment

**Scenario:** Pre-generation started but user closes tab before complete

**Behavior:**
- Polling continues indefinitely in background (wasteful but safe)
- No impact on UX (tab is closed)
- If user returns to tab, polling either completes or fails silently

**Future improvement:** Could add abort logic with timeout, but out of scope for v1.

---

## API Cost Analysis

**Current:**
- 1 generation per scenario transition (~$0.002-0.005 per image)
- User sees loading screen

**With Pre-generation:**
- Scenario 1 (user alone): 1 Rival pre-gen (unavoidable cost)
- Scenario 2 (2-6 users): 1 Dictator pre-gen (unavoidable cost)
- Scenario 3: 0 cost (no pre-gen needed)

**Additional cost:** Minimal—only the pre-generated images. No retries, no failed generations (silent ignore).

**Deduplication benefit:** If multiple users arrive simultaneously, pre-generation triggers once. Without deduplication, it could trigger N times.

---

## Edge Cases

### Multiple Scenario Changes Rapid-Fire

**Scenario:** Count goes 1 → 2 → 7 very quickly

**Behavior:**
1. Scenario 1 renders → pre-generate Scenario 2
2. Scenario 2 renders (Scenario 2 generation still in progress) → pre-generate Scenario 3
3. Scenario 3 renders (Scenario 3 generation started) → no pre-gen (scenario 3 is target)

**Result:** If Scenario 3 generation isn't done yet, user sees loading screen briefly. Acceptable.

### Pre-generation Takes Longer Than Transition

**Scenario:** User count goes 1 → 2 before Rival image is done generating

**Behavior:**
1. `useIPhoneAd(2)` checks cache: miss
2. Starts fresh generation (even though pre-generation is still polling)
3. Two parallel generations running (should rarely happen due to 5-10 sec generation time)

**Result:** One completes first, both write to cache. No conflict (same scenario, same image).

### Cache Pollution

**Scenario:** Same scenario generated multiple times (new generation started each time)

**Behavior:**
- Cache can only hold one image per scenario (Scenario 2, Scenario 3)
- Latest successful generation overwrites previous
- No memory leak

---

## Testing Strategy

### Unit Tests

1. **`useScenarioPregeneration`:**
   - Next scenario calculated correctly
   - Deduplication works (same scenario not generated twice)
   - Cache written on success
   - Errors handled silently

2. **Integration:**
   - Index.tsx with changing count → pre-generation triggered
   - Scenario transition happens → useIPhoneAd uses cached image

### Manual Testing

1. Open app (Scenario 1)
2. Wait ~10 seconds (Rival pre-generation in progress)
3. Open second tab (count → 2, Scenario 2 transition)
4. Verify: **Rival image appears instantly** (no loading screen)
5. Wait ~10 seconds (Dictator pre-generation in progress)
6. Open 6 more tabs (count → 7, Scenario 3 transition)
7. Verify: **Dictator image appears instantly**

---

## Success Criteria

✅ Scenario transitions (Whisper→Rival, Rival→Dictator) have **zero loading time**
✅ Pre-generation failures don't break UI (silent fail)
✅ No API cost regression (only pre-generate once per scenario)
✅ Existing components unchanged (backward compatible)

---

## Files Modified

| File | Change | Lines |
|------|--------|-------|
| `src/hooks/useScenarioPregeneration.ts` | NEW | ~70 |
| `src/pages/Index.tsx` | +1 hook call | +1 |
| **Total** | | ~71 |

---

## Future Improvements (Out of Scope)

- Add timeout to pre-generation polling (e.g., stop after 30 sec)
- Retry logic with exponential backoff
- Metrics/logging for pre-generation success rate
- Cancel in-progress pre-generation when scenario changes
- Cache expiration (e.g., refresh images every 1 hour)
