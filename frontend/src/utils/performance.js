// Performance monitoring utility
class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
  }

  // Start timing a metric
  startTimer(name) {
    this.metrics[name] = {
      startTime: performance.now(),
      endTime: null,
      duration: null
    };
  }

  // End timing a metric
  endTimer(name) {
    if (this.metrics[name]) {
      this.metrics[name].endTime = performance.now();
      this.metrics[name].duration = this.metrics[name].endTime - this.metrics[name].startTime;
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`⏱️ ${name}: ${this.metrics[name].duration.toFixed(2)}ms`);
      }
      
      // Notify observers
      this.notifyObservers(name, this.metrics[name]);
    }
  }

  // Measure component render time
  measureRender(componentName, renderFunction) {
    this.startTimer(`render-${componentName}`);
    const result = renderFunction();
    this.endTimer(`render-${componentName}`);
    return result;
  }

  // Add observer for performance events
  addObserver(callback) {
    this.observers.push(callback);
  }

  // Remove observer
  removeObserver(callback) {
    this.observers = this.observers.filter(obs => obs !== callback);
  }

  // Notify all observers
  notifyObservers(metricName, metricData) {
    this.observers.forEach(observer => {
      try {
        observer(metricName, metricData);
      } catch (error) {
        console.error('Performance observer error:', error);
      }
    });
  }

  // Get all metrics
  getMetrics() {
    return { ...this.metrics };
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = {};
  }

  // Measure page load performance
  measurePageLoad() {
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const navigation = performance.getEntriesByType('navigation')[0];
        if (navigation) {
          this.metrics['pageLoad'] = {
            duration: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByType('paint')[1]?.startTime || 0
          };
        }
      });
    }
  }

  // Measure API call performance
  measureApiCall(url, apiCall) {
    this.startTimer(`api-${url}`);
    return apiCall().finally(() => {
      this.endTimer(`api-${url}`);
    });
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Start measuring page load performance
performanceMonitor.measurePageLoad();

export default performanceMonitor;

// React hook for measuring component performance
export const usePerformanceMeasure = (componentName) => {
  const measureRender = (renderFunction) => {
    return performanceMonitor.measureRender(componentName, renderFunction);
  };

  return { measureRender };
}; 