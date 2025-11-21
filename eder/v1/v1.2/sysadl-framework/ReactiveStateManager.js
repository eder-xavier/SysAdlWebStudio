/**
 * Reactive State Management System for SysADL
 * Implements React-style reactive updates with automatic dependency tracking
 * 
 * Key Features:
 * - Proxy-based state observation
 * - Automatic change detection
 * - Subscription-based notifications
 * - Nested object support
 * - Performance optimizations
 */

class ReactiveStateManager {
  constructor() {
    this.subscribers = new Map(); // path -> Set of callbacks
    this.stateCache = new Map();  // path -> last known value
    this.changeQueue = new Set(); // pending notifications
    this.isProcessingChanges = false;
    
    // Create reactive state proxy
    this.state = this.createReactiveProxy({}, '');
    
    // Performance stats
    this.stats = {
      subscriptions: 0,
      notifications: 0,
      stateChanges: 0,
      averageNotificationTime: 0
    };

    console.log('ReactiveStateManager initialized - ready for reactive state tracking');
  }

  /**
   * Create a reactive proxy that tracks all property access and modifications
   */
  createReactiveProxy(target, basePath) {
    const self = this;
    
    return new Proxy(target, {
      get(obj, prop) {
        const fullPath = basePath ? `${basePath}.${prop}` : prop;
        
        // Return value, creating nested proxy if needed
        const value = obj[prop];
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // Create reactive proxy for nested objects
          if (!obj[`__proxy_${prop}`]) {
            obj[`__proxy_${prop}`] = self.createReactiveProxy(value, fullPath);
          }
          return obj[`__proxy_${prop}`];
        }
        
        return value;
      },

      set(obj, prop, newValue) {
        const fullPath = basePath ? `${basePath}.${prop}` : prop;
        const oldValue = obj[prop];
        
        // Only trigger if value actually changed
        if (oldValue !== newValue) {
          obj[prop] = newValue;
          
          // Handle nested objects
          if (newValue !== null && typeof newValue === 'object' && !Array.isArray(newValue)) {
            obj[`__proxy_${prop}`] = self.createReactiveProxy(newValue, fullPath);
          }
          
          // Queue change notification
          self.queueStateChange(fullPath, oldValue, newValue);
          self.stats.stateChanges++;
        }
        
        return true;
      },

      deleteProperty(obj, prop) {
        const fullPath = basePath ? `${basePath}.${prop}` : prop;
        const oldValue = obj[prop];
        
        if (prop in obj) {
          delete obj[prop];
          delete obj[`__proxy_${prop}`];
          self.queueStateChange(fullPath, oldValue, undefined);
          self.stats.stateChanges++;
        }
        
        return true;
      }
    });
  }

  /**
   * Subscribe to changes in a specific state path
   * Supports wildcard patterns and nested paths
   */
  subscribe(path, callback, options = {}) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    const subscription = {
      callback: callback,
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        immediate: options.immediate || false,
        deep: options.deep !== false, // default true
        priority: options.priority || 'normal'
      }
    };
    
    this.subscribers.get(path).add(subscription);
    this.stats.subscriptions++;

    console.log(`Subscribed to state path: ${path} (${subscription.id})`);

    // Call immediately if requested and value exists
    if (subscription.options.immediate && this.hasValue(path)) {
      const currentValue = this.getValue(path);
      try {
        callback(currentValue, undefined, path);
      } catch (error) {
        console.error(`Error in immediate subscription callback for ${path}:`, error);
      }
    }

    // Return unsubscribe function
    return () => this.unsubscribe(path, subscription.id);
  }

  /**
   * Unsubscribe from state changes
   */
  unsubscribe(path, subscriptionId) {
    if (this.subscribers.has(path)) {
      const subs = this.subscribers.get(path);
      for (const sub of subs) {
        if (sub.id === subscriptionId) {
          subs.delete(sub);
          console.log(`Unsubscribed from ${path} (${subscriptionId})`);
          break;
        }
      }
      
      // Clean up empty subscription sets
      if (subs.size === 0) {
        this.subscribers.delete(path);
      }
    }
  }

  /**
   * Queue a state change for batch processing
   */
  queueStateChange(path, oldValue, newValue) {
    this.stateCache.set(path, newValue);
    this.changeQueue.add({ path, oldValue, newValue, timestamp: Date.now() });
    
    // Process changes asynchronously to batch them
    if (!this.isProcessingChanges) {
      this.isProcessingChanges = true;
      setImmediate(() => this.processChangeQueue());
    }
  }

  /**
   * Process all queued state changes and notify subscribers
   */
  processChangeQueue() {
    const startTime = Date.now();
    const changes = Array.from(this.changeQueue);
    this.changeQueue.clear();
    
    // Group changes by path for efficient processing
    const changesByPath = new Map();
    for (const change of changes) {
      if (!changesByPath.has(change.path)) {
        changesByPath.set(change.path, []);
      }
      changesByPath.get(change.path).push(change);
    }

    // Notify subscribers for each changed path
    for (const [path, pathChanges] of changesByPath) {
      const latestChange = pathChanges[pathChanges.length - 1]; // Use latest change
      this.notifySubscribers(path, latestChange.oldValue, latestChange.newValue);
    }

    // Update performance stats
    const duration = Date.now() - startTime;
    this.stats.averageNotificationTime = 
      (this.stats.averageNotificationTime * this.stats.notifications + duration) / 
      (this.stats.notifications + 1);
    this.stats.notifications++;

    this.isProcessingChanges = false;

    console.log(`Processed ${changes.length} state changes in ${duration}ms`);
  }

  /**
   * Notify all subscribers of a path change
   */
  notifySubscribers(changedPath, oldValue, newValue) {
    const notifiedPaths = new Set();
    
    // Find all matching subscription paths
    for (const [subscribedPath, subscribers] of this.subscribers) {
      if (this.pathMatches(changedPath, subscribedPath) && !notifiedPaths.has(subscribedPath)) {
        notifiedPaths.add(subscribedPath);
        
        for (const subscription of subscribers) {
          try {
            subscription.callback(newValue, oldValue, changedPath);
          } catch (error) {
            console.error(`Error in subscription callback for ${subscribedPath}:`, error);
          }
        }
      }
    }

    // Also check for parent path notifications (deep watching)
    for (const [subscribedPath, subscribers] of this.subscribers) {
      if (this.isParentPath(subscribedPath, changedPath) && !notifiedPaths.has(subscribedPath)) {
        notifiedPaths.add(subscribedPath);
        
        for (const subscription of subscribers) {
          if (subscription.options.deep) {
            try {
              const parentValue = this.getValue(subscribedPath);
              subscription.callback(parentValue, parentValue, subscribedPath);
            } catch (error) {
              console.error(`Error in deep subscription callback for ${subscribedPath}:`, error);
            }
          }
        }
      }
    }
  }

  /**
   * Check if a changed path matches a subscribed path
   */
  pathMatches(changedPath, subscribedPath) {
    // Exact match
    if (changedPath === subscribedPath) {
      return true;
    }
    
    // Wildcard matching (simple implementation)
    if (subscribedPath.includes('*')) {
      const regex = new RegExp(subscribedPath.replace(/\*/g, '.*'));
      return regex.test(changedPath);
    }
    
    return false;
  }

  /**
   * Check if subscribedPath is a parent of changedPath
   */
  isParentPath(subscribedPath, changedPath) {
    return changedPath.startsWith(subscribedPath + '.');
  }

  /**
   * Get current value at a path
   */
  getValue(path) {
    const parts = path.split('.');
    let current = this.state;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Set value at a path
   */
  setValue(path, value) {
    const parts = path.split('.');
    let current = this.state;
    
    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    
    // Set final value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  /**
   * Check if a path has a value
   */
  hasValue(path) {
    return this.getValue(path) !== undefined;
  }

  /**
   * Get current state as plain object (non-reactive)
   */
  getSnapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Bulk update state from object
   */
  updateState(updates) {
    for (const [path, value] of Object.entries(updates)) {
      this.setValue(path, value);
    }
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    return {
      ...this.stats,
      activeSubscriptions: Array.from(this.subscribers.entries()).reduce(
        (total, [path, subs]) => total + subs.size, 0
      ),
      subscribedPaths: this.subscribers.size,
      cacheSize: this.stateCache.size
    };
  }

  /**
   * Debug: List all current subscriptions
   */
  listSubscriptions() {
    console.log('\n=== Active State Subscriptions ===');
    if (this.subscribers.size === 0) {
      console.log('No active subscriptions');
      return;
    }

    for (const [path, subscribers] of this.subscribers) {
      console.log(`${path}: ${subscribers.size} subscriber(s)`);
      for (const sub of subscribers) {
        console.log(`  - ${sub.id} (${sub.options.priority})`);
      }
    }
    console.log('==================================\n');
  }
}

module.exports = { ReactiveStateManager };