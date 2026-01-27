# Auto-Injection of Events in SysADL Simulation: Permissive Mode

## Abstract

This article describes the **Permissive Mode** feature implemented in the SysADL simulator, which enables automatic recovery from incomplete model specifications. When a simulation timeout occurs due to missing event chains, the simulator can infer and inject the required state changes to continue execution, providing valuable diagnostic feedback without halting the entire simulation.

## 1. Introduction

During the development and validation of SysADL models, incomplete specifications are common. A typical scenario involves missing `inject` statements that would trigger reactive conditions, leading to simulation timeouts. Traditionally, these timeouts would terminate the simulation, requiring manual analysis and model correction before retesting.

The **Permissive Mode** addresses this challenge by:
1. Detecting missing event chains during timeout analysis
2. Inferring the required state changes based on multiple strategies
3. Automatically injecting the inferred state to continue the simulation
4. Logging all auto-recoveries for post-simulation review

## 2. Architecture

### 2.1 Execution Modes

The simulator supports two execution modes:

| Mode | Behavior | Use Case |
|------|----------|----------|
| **Strict** (default) | Fail on timeout, abort after retries | Production validation |
| **Permissive** | Auto-recover from missing events | Development, debugging |

```bash
# Strict mode (default)
node SysADLSimulator.js model.sysadl

# Permissive mode
node SysADLSimulator.js model.sysadl --mode=permissive
```

### 2.2 Auto-Recovery Pipeline

When a scene timeout occurs in permissive mode, the following pipeline executes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     TIMEOUT DETECTED                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 1: Dependency Analysis                            │
│  • Identify which finish event is expected                      │
│  • Find reactive conditions that would emit this event          │
│  • Collect pending (unsatisfied) conditions                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 2: Condition-Based Recovery                       │
│  • Parse condition expressions (e.g., "agv2.sensor == stationC")│
│  • Extract left-hand path and right-hand value                  │
│  • Attempt to inject the required state change                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │  Success?         │
                    └─────────┬─────────┘
                         No   │   Yes → Continue simulation
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│          STEP 3: Pattern-Based Inference (Fallback)             │
│  • Analyze finish event naming patterns                         │
│  • Infer state based on domain conventions                      │
│  • Example: "AGV2NotifArriveC" → agv2.sensor = stationC.ID      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  Log recovery and continue    │
              │  OR                           │
              │  Report failure and proceed   │
              │  with normal timeout handling │
              └───────────────────────────────┘
```

## 3. Implementation Details

### 3.1 Condition Expression Parsing

The `parseConditionExpression()` method extracts actionable information from reactive condition expressions:

```javascript
// Input: "agv2.sensor == stationC.ID"
// Output: { leftPath: "agv2.sensor", rightValue: "stationC.ID" }
```

### 3.2 State Injection

The `autoInjectState()` method resolves entity references and sets the required value:

```javascript
// 1. Find entity "agv2" in environment configuration
// 2. Resolve "stationC.ID" to its actual value (e.g., "StationC")
// 3. Set agv2.sensor = "StationC"
// 4. This triggers reactive condition → emits expected event
```

### 3.3 Pattern-Based Inference

When no pending conditions are available, the simulator uses naming conventions:

| Event Pattern | Inferred State Change |
|---------------|----------------------|
| `AGV{N}NotifArrive{X}` | `agv{N}.sensor = station{X}.ID` |

This approach leverages domain knowledge embedded in event naming conventions.

## 4. Example: AGV Factory Scenario

Consider a factory automation model where AGV2 must notify arrival at Station C:

**Original Model (Incomplete):**
```sysadl
scene SCN_MoveAGV2toC {
    startEvent: cmdAGV2toC
    finishEvent: AGV2NotifArriveC  // Requires agv2.sensor == stationC.ID
}
// Missing: inject statement to set agv2.sensor
```

**Simulation Output (Permissive Mode):**
```
[TIMEOUT] Scene SCN_MoveAGV2toC timed out waiting for: AGV2NotifArriveC

[AUTO-RECOVERY] Attempting auto-recovery for scene: SCN_MoveAGV2toC
[AUTO-RECOVERY] No pending conditions found, trying inference...
[AUTO-RECOVERY] Set agv2.sensor = "StationC"
[AUTO-RECOVERY] Inferred and set agv2.sensor = stationC.ID
[AUTO-RECOVERY] Scene SCN_MoveAGV2toC auto-recovered, continuing simulation

✅ Scene completed: SCN_MoveAGV2toC (30010ms)
```

## 5. Simulation Summary

At the end of execution, a summary of all auto-recoveries is displayed:

```
============================================================
[SIMULATION SUMMARY]
============================================================
Mode: permissive
Auto-recoveries: 1
  - SCN_MoveAGV2toC: Inferred and set agv2.sensor = stationC.ID (inferred)
============================================================
```

## 6. Benefits and Limitations

### Benefits
- **Faster iteration**: Continue testing beyond first incomplete specification
- **Diagnostic value**: Clearly identifies what state changes are missing
- **Non-destructive**: Original model remains unchanged
- **Traceable**: All recoveries logged for post-analysis

### Limitations
- **Domain-specific inference**: Pattern matching works best with consistent naming
- **No semantic validation**: Cannot verify if inferred state is semantically correct
- **Timeout overhead**: Recovery only triggers after full timeout period

## 7. Conclusion

The Permissive Mode with auto-injection provides a pragmatic approach to handling incomplete SysADL models during development. By combining condition analysis with pattern-based inference, the simulator can maintain forward progress while clearly documenting model deficiencies for later correction.

This feature exemplifies the balance between strict validation (ensuring model correctness) and practical usability (enabling iterative development workflows).
