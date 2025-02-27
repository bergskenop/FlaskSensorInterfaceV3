import { getRandomColor } from './chart-utils.js';

/**
 * SensorGraph class handles all sensor data visualization and management
 */
class SensorGraph {
  constructor() {
    this.chartInstance = null;
    this.eventSource = null;
    this.startTime = null;
    this.isCycleRunning = false;
    this.availableSensors = new Set();
    this.selectedSensors = new Set();
    this.maxElapsedSeconds = 0; // Track the maximum elapsed time

    // Bind methods to maintain 'this' context
    this.toggleSensorStream = this.toggleSensorStream.bind(this);
    this.handleSensorData = this.handleSensorData.bind(this);
    this.updateSensorList = this.updateSensorList.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.cleanupOnUnload = this.cleanupOnUnload.bind(this);

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', () => this.initialize());
  }

  /**
   * Initialize the graph and event listeners
   */
  async initialize() {
    try {
      const response = await fetch('/get-stored-graph-data');
      const data = await response.json();
      this.renderGraph(data);

      // Set up event listeners
      const cycleButton = document.getElementById('StartCycle');
      cycleButton.addEventListener('click', this.toggleSensorStream);
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  /**
   * Formats a timestamp in HH:mm:ss format
   * @param {Date} date - The date to format
   * @returns {string} Formatted time string
   */
  formatTime(date) {
    return date.toTimeString().split(' ')[0];
  }

  /**
   * Creates chart configuration with appropriate options
   * @param {Object} config - Chart configuration data
   * @returns {Object} Chart configuration object
   */
  createChartConfig(config = {}) {
    this.startTime = Date.now();
    const options = {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 300, // Start with 5 minutes (300 seconds) as default
            ticks: {
              callback: (value) => {
                const timestamp = new Date(this.startTime + value * 1000);
                return this.formatTime(timestamp);
              }
            }
          },
          y: {
            min: 0,
            max: config.maxY || 100
          }
        },
        plugins: {
          legend: {
            position: 'top'
          }
        }
      }
    };

    return options;
  }

  /**
   * Renders the graph with initial data
   * @param {Object} response - Initial graph data
   */
  renderGraph(response) {
    const ctx = document.getElementById('newGraph').getContext('2d');
    const { desired_path: desiredPath, data: graphData, config } = response;

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const chartConfig = this.createChartConfig(config);
    this.chartInstance = new Chart(ctx, chartConfig);

    if (desiredPath) {
      this.addDesiredPath(desiredPath);
    }

    this.chartInstance.update();
  }

  /**
   * Adds desired temperature path to the chart
   * @param {Array|Object} desiredPath - Desired temperature data
   */
  addDesiredPath(desiredPath) {
    if (!Array.isArray(desiredPath) || desiredPath.length === 1) {
      const desiredTemp = Array.isArray(desiredPath) ? desiredPath[0].y : desiredPath.y;
      this.chartInstance.options.plugins.annotation = {
        annotations: {
          desiredLine: {
            type: 'line',
            yMin: desiredTemp,
            yMax: desiredTemp,
            borderColor: 'red',
            borderWidth: 2,
            label: {
              content: `Desired Temperature: ${desiredTemp}°C`,
              enabled: true,
              position: 'end'
            }
          }
        }
      };
    } else {
      this.chartInstance.data.datasets.push({
        label: 'Desired Graph',
        data: desiredPath.map(point => ({ x: point.x, y: point.y })),
        borderColor: 'red',
        borderWidth: 2,
        fill: false,
        pointRadius: 1
      });
    }
  }

  /**
   * Initializes the sensor data stream
   */
  initializeStream() {
    if (this.eventSource) {
      this.eventSource.close();
    }

    this.startTime = Date.now();
    this.maxElapsedSeconds = 0; // Reset max elapsed time
    this.updateChartTimeAxis();
    this.eventSource = new EventSource('/stream');

    this.eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleSensorData(data);
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource failed:', error);
      this.eventSource.close();
      this.isCycleRunning = false;
      document.getElementById('StartCycle').textContent = 'Start Cycle';

      // Remove event listeners when cycle stops
      this.removeEventListeners();
    };
  }

  /**
   * Handler for beforeunload event to warn users before leaving the page
   * @param {Event} e - The beforeunload event
   * @returns {string} Message to display in the confirmation dialog
   */
  handleBeforeUnload(e) {
    if (this.isCycleRunning) {
      // Standard way to show a confirmation dialog when leaving page
      const message = 'Cycle is still running! Leaving this page will stop data collection. Are you sure you want to leave?';
      e.returnValue = message; // Standard for most browsers
      return message; // For older browsers
    }
  }

  /**
   * Cleanup function to be called when page is actually unloading
   * This sends a final request to stop sensors
   */
  cleanupOnUnload() {
    if (this.isCycleRunning) {
      // Use sendBeacon which is designed specifically for analytics
      // data on page unload. It's more reliable than fetch/XHR in unload events.
      navigator.sendBeacon('/stop_sensors', JSON.stringify({}));

      // Close the EventSource if it exists
      if (this.eventSource) {
        this.eventSource.close();
      }
    }
  }

  /**
   * Add event listeners for page navigation events
   */
  addEventListeners() {
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('unload', this.cleanupOnUnload);
  }

  /**
   * Remove event listeners for page navigation events
   */
  removeEventListeners() {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('unload', this.cleanupOnUnload);
  }

  /**
   * Clears all sensor data from the chart while preserving the desired path
   */
  clearChartData() {
    if (this.chartInstance) {
      // Keep only the 'Desired Graph' dataset if it exists
      this.chartInstance.data.datasets = this.chartInstance.data.datasets.filter(
        dataset => dataset.label === 'Desired Graph'
      );
      this.chartInstance.update();
    }
  }

  /**
   * Updates the chart's time axis based on the current start time
   */
  updateChartTimeAxis() {
    if (this.chartInstance) {
      this.chartInstance.options.scales.x.ticks.callback = (value) => {
        const timestamp = new Date(this.startTime + value * 1000);
        return this.formatTime(timestamp);
      };
      this.chartInstance.update();
    }
  }

  /**
   * Updates the chart's x-axis range based on incoming data
   * @param {number} elapsedSeconds - Current elapsed time in seconds
   */
  updateChartXAxisRange(elapsedSeconds) {
    if (!this.chartInstance) return;

    // Update the max elapsed seconds if this is the highest we've seen
    if (elapsedSeconds > this.maxElapsedSeconds) {
      this.maxElapsedSeconds = elapsedSeconds;

      // If elapsed time exceeds current x-axis max, extend it with a 10-second buffer
      const currentMax = this.chartInstance.options.scales.x.max;
      if (elapsedSeconds >= currentMax) {
        this.chartInstance.options.scales.x.max = elapsedSeconds + 10; // Add 10s buffer
      }
    }

    // Ensure x-axis max is at least 5 minutes (300 seconds)
    if (this.chartInstance.options.scales.x.max < 300) {
      this.chartInstance.options.scales.x.max = 300;
    }

    this.chartInstance.update();
  }

  /**
   * Handles incoming sensor data and updates the chart
   * @param {Object} data - The sensor data
   */
  handleSensorData(data) {
    if (data.status === 'stopped') {
      this.eventSource.close();
      this.clearChartData();  // Clear any existing data before stopping
      return;
    }

    this.updateSensorList(data);

    if (this.chartInstance) {
      const elapsedSeconds = (Date.now() - this.startTime) / 1000;
      this.updateChartData(data, elapsedSeconds);
      this.updateChartXAxisRange(elapsedSeconds);
    }
  }

  /**
   * Updates chart data with new sensor readings
   * @param {Object} data - Sensor data
   * @param {number} elapsedSeconds - Elapsed time in seconds
   */
  updateChartData(data, elapsedSeconds) {
    // Process data for all available sensors
    Object.entries(data).forEach(([sensorName, value]) => {
      if (typeof value === 'number') {
        // Find or create dataset for this sensor
        let dataset = this.chartInstance.data.datasets.find(ds => ds.label === sensorName);

        if (!dataset) {
          dataset = {
            label: sensorName,
            data: [],
            borderColor: getRandomColor(),
            fill: false,
            pointRadius: 1,
            hidden: !this.selectedSensors.has(sensorName) // Hide if not selected
          };
          this.chartInstance.data.datasets.push(dataset);
        }

        dataset.data.push({
          x: elapsedSeconds,
          y: value
        });
      }
    });

    this.chartInstance.update();
  }

  /**
   * Updates dataset visibility based on sensor selection
   * @param {string} sensorName - Name of the sensor
   * @param {boolean} isVisible - Whether the sensor should be visible
   */
  updateDatasetVisibility(sensorName, isVisible) {
    const dataset = this.chartInstance.data.datasets.find(ds => ds.label === sensorName);
    if (dataset) {
      dataset.hidden = !isVisible;
      this.chartInstance.update();
    }
  }

  /**
   * Updates the sensor list UI and manages sensor selection
   * @param {Object} data - Sensor data
   */
  updateSensorList(data) {
    const currentSensors = new Set(
      Object.keys(data).filter(key => typeof data[key] === 'number')
    );

    // Remove inactive sensors
    for (const sensor of this.availableSensors) {
      if (!currentSensors.has(sensor)) {
        this.availableSensors.delete(sensor);
        this.selectedSensors.delete(sensor);
      }
    }

    // Add new sensors
    currentSensors.forEach(sensor => {
      if (!this.availableSensors.has(sensor)) {
        this.availableSensors.add(sensor);
        this.selectedSensors.add(sensor);
      }
    });

    this.renderSensorList();
  }

  /**
   * Renders the sensor list UI
   */
  renderSensorList() {
    const sensorList = document.getElementById('sensorList');
    sensorList.innerHTML = '';

    Array.from(this.availableSensors).sort().forEach(sensorName => {
      const div = document.createElement('div');
      div.className = 'sensor-checkbox';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = sensorName;
      checkbox.checked = this.selectedSensors.has(sensorName);
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.selectedSensors.add(sensorName);
        } else {
          this.selectedSensors.delete(sensorName);
        }
        // Update dataset visibility instead of removing data
        this.updateDatasetVisibility(sensorName, e.target.checked);
      });

      const label = document.createElement('label');
      label.htmlFor = sensorName;
      label.textContent = sensorName;

      div.appendChild(checkbox);
      div.appendChild(label);
      sensorList.appendChild(div);
    });
  }

  /**
   * Toggles the sensor stream between start and stop states
   */
  async toggleSensorStream() {
    const cycleButton = document.getElementById('StartCycle');

    if (!this.isCycleRunning) {
      try {
        const response = await fetch('/start_sensors', { method: 'POST' });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log("Sensors started:", result);
        this.clearChartData();  // Clear any existing data before starting
        this.isCycleRunning = true;
        cycleButton.textContent = 'Stop Cycle';
        this.initializeStream();

        // Add event listeners for page navigation
        this.addEventListeners();
      } catch (error) {
        console.error("Error starting sensor stream:", error);
        this.isCycleRunning = false;
        cycleButton.textContent = 'Start Cycle';
      }
    } else {
      if (this.eventSource) {
        this.eventSource.close();
      }

      try {
        const response = await fetch('/stop_sensors', { method: 'POST' });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        console.log("Sensors stopped:", result);
        this.clearChartData();  // Clear the chart data when stopping
        this.isCycleRunning = false;
        cycleButton.textContent = 'Start Cycle';

        // Remove event listeners when cycle is stopped
        this.removeEventListeners();
      } catch (error) {
        console.error("Error stopping sensor stream:", error);
      }
    }
  }
}

// Initialize the application
new SensorGraph();