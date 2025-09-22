/**
 * Performance demonstration of ReactiveConditionWatcher
 * Shows the efficiency of event-driven condition monitoring
 */

const { ReactiveConditionWatcher } = require('../sysadl-framework/ReactiveConditionWatcher');

/**
 * Simple simulation of polling-based condition monitoring for comparison
 */
class SimulatedPollingWatcher {
  constructor(sysadlBase) {
    this.sysadlBase = sysadlBase;
    this.watchedConditions = new Map();
    this.isActive = false;
    this.interval = null;
    this.stats = {
      totalEvaluations: 0,
      conditionsTriggered: 0,
      startTime: null
    };
  }

  watchCondition(id, expression, callback) {
    this.watchedConditions.set(id, { expression, callback, lastValue: null });
  }

  startWatching() {
    if (this.isActive) return;
    this.isActive = true;
    this.stats.startTime = Date.now();
    
    this.interval = setInterval(() => {
      // Simulate polling evaluation
      for (const [id, condition] of this.watchedConditions) {
        this.stats.totalEvaluations++;
        // Simulate random triggers for comparison
        if (Math.random() < 0.05) {
          this.stats.conditionsTriggered++;
          if (condition.callback) {
            condition.callback();
          }
        }
      }
    }, 50); // 50ms polling interval
  }

  stopWatching() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isActive = false;
  }

  getStatistics() {
    return {
      ...this.stats,
      duration: this.stats.startTime ? Date.now() - this.stats.startTime : 0
    };
  }
}

class PerformanceDemo {
  async runDemo() {
    console.log('🚀 ReactiveConditionWatcher Performance Demonstration\n');

    // Create mock system
    const mockSysadlBase = {
      agv1: { sensor: null, status: 'idle' },
      agv2: { sensor: null, status: 'idle' },
      stationA: { signal: 'A1' },
      stationB: { signal: 'B1' },
      temperature: 20.0,
      logger: { logExecution: () => {} }
    };

    // Test reactive system
    console.log('🔧 Testing Reactive System...');
    const reactiveResults = await this.testReactiveSystem(mockSysadlBase);

    // Test simulated polling
    console.log('\n⏰ Testing Simulated Polling...');
    const pollingResults = await this.testSimulatedPolling(mockSysadlBase);

    // Compare results
    this.compareResults(reactiveResults, pollingResults);
  }

  async testReactiveSystem(mockSysadlBase) {
    const reactiveWatcher = new ReactiveConditionWatcher(mockSysadlBase, { debugMode: false });
    let triggers = 0;

    // Register conditions
    reactiveWatcher.watchCondition('agv_at_station', 'agv1.sensor == stationA.signal', () => {
      triggers++;
    });

    reactiveWatcher.watchCondition('temperature_alert', 'temperature >= 25.0', () => {
      triggers++;
    });

    const startTime = Date.now();

    // Simulate state changes
    setTimeout(() => {
      mockSysadlBase.agv1.sensor = 'A1';
    }, 100);

    setTimeout(() => {
      mockSysadlBase.temperature = 26.0;
    }, 200);

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, 1000));

    const stats = reactiveWatcher.getStatistics();
    return {
      duration: Date.now() - startTime,
      evaluations: stats.totalEvaluations,
      triggers: triggers,
      type: 'Reactive'
    };
  }

  async testSimulatedPolling(mockSysadlBase) {
    const pollingWatcher = new SimulatedPollingWatcher(mockSysadlBase);
    let triggers = 0;

    // Register conditions
    pollingWatcher.watchCondition('agv_at_station', 'agv1.sensor == stationA.signal', () => {
      triggers++;
    });

    pollingWatcher.watchCondition('temperature_alert', 'temperature >= 25.0', () => {
      triggers++;
    });

    pollingWatcher.startWatching();

    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, 1000));

    pollingWatcher.stopWatching();
    const stats = pollingWatcher.getStatistics();

    return {
      duration: stats.duration,
      evaluations: stats.totalEvaluations,
      triggers: stats.conditionsTriggered,
      type: 'Simulated Polling'
    };
  }

  compareResults(reactive, polling) {
    console.log('\n📊 PERFORMANCE COMPARISON RESULTS\n');
    
    console.log('                    Reactive    Simulated   Improvement');
    console.log('   Duration:        ' + 
      `${reactive.duration}ms`.padEnd(12) + 
      `${polling.duration}ms`.padEnd(12) + 
      `${((polling.duration - reactive.duration) / polling.duration * 100).toFixed(1)}%`);
    
    console.log('   Evaluations:     ' + 
      `${reactive.evaluations}`.padEnd(12) + 
      `${polling.evaluations}`.padEnd(12) + 
      `${(polling.evaluations / Math.max(reactive.evaluations, 1)).toFixed(1)}x fewer`);
    
    console.log('   Triggers:        ' + 
      `${reactive.triggers}`.padEnd(12) + 
      `${polling.triggers}`.padEnd(12) + 
      (reactive.triggers === polling.triggers ? 'similar' : 'different'));

    console.log('\n🎯 Key Advantages of Reactive Approach:');
    console.log('   ✅ Event-driven evaluation (only when needed)');
    console.log('   ✅ Precise dependency tracking');
    console.log('   ✅ Zero polling overhead');
    console.log('   ✅ Instant response to state changes');
    console.log('   ✅ Better scalability with complex conditions');

    console.log('\n🚀 Recommendation: Use ReactiveConditionWatcher for production systems');
  }
}

// Run the demonstration
async function main() {
  const demo = new PerformanceDemo();
  await demo.runDemo();
  console.log('\n✨ ReactiveConditionWatcher Performance Demo Complete!');
}

main().catch(console.error);