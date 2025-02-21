import { getRandomColor } from './chart-utils.js';

let chartInstance = null;
let datasets = [];
let isCycleRunning = false;
let eventSource = null;  // Store the EventSource instance
let startTime = null;
let availableSensors = new Set();  // Keep track of available sensors
let selectedSensors = new Set();  // Keep track of selected sensors

document.addEventListener('DOMContentLoaded', () => {
  // Load any stored graph data (if available) and render an initial chart.
  fetch('/get-stored-graph-data')
    .then(response => response.json())
    .then(renderGraph)
    .catch(console.error);

  // When "Start/Stop cycle" is clicked, toggle the sensor stream.
  const cycleButton = document.getElementById('StartCycle');
  cycleButton.addEventListener('click', toggleSensorStream);
});

/**
 * Formats a timestamp in HH:mm:ss format
 * @param {Date} date - The date to format
 * @returns {string} Formatted time string
 */
function formatTime(date) {
  return date.toTimeString().split(' ')[0];
}

/**
 * Renders the initial graph using pre-stored graph data.
 */
function renderGraph(response) {
  const ctx = document.getElementById('newGraph').getContext('2d');
  const {desired_path: desiredPath, data: graphData, config } = response;

  if (chartInstance) {
    chartInstance.destroy();
  }

  // Create the chart with appropriate axis ranges
  const maxTemperature = Math.max(...desiredPath.map(point => point.y)) * 1.5;
  const maxY = maxTemperature;
  const currentTime = new Date();
  const startX = 0;
  const maxX = Math.max(...desiredPath.map(point => point.x));

  const options = {
    x: {
      type: 'linear',
      position: 'bottom',
      min: startX,
      max: maxX,
      ticks: {
        callback: function(value) {
          // Convert the x-value (seconds) to a time string
          const timestamp = new Date(currentTime.getTime() + value * 1000);
          return formatTime(timestamp);
        }
      }
    },
    y: {
      min: 0,
      max: maxY
    }
  };

  chartInstance = createChart(ctx, datasets, options);

  // Add single-point desired temperature line if applicable
  if (desiredPath){
    if ((!Array.isArray(desiredPath) || desiredPath.length === 1)) {
        const desiredTemp = Array.isArray(desiredPath) ? desiredPath[0].y : desiredPath.y;
        chartInstance.options.plugins.annotation.annotations.desiredLine = {
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
        };
    }
    else {
      // Add multiple points as a dataset to existing chart
      chartInstance.data.datasets.push({
        label: 'Desired Graph',
        data: desiredPath.map(point => ({ x: point.x, y: point.y })),
        borderColor: 'red',
        borderWidth: 2,
        fill: false,
        pointRadius: 1
      });
    }
  }

  chartInstance.update();
}

/**
 * Toggles the sensor stream between start and stop states.
 */
function toggleSensorStream() {
  const cycleButton = document.getElementById('StartCycle');
  
  if (!isCycleRunning) {
    fetch('/start_sensors', { method: 'POST' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        console.log("Sensors started:", result);
        isCycleRunning = true;
        cycleButton.textContent = 'Stop Cycle';
        startTime = Date.now();
        initializeStream();
      })
      .catch(error => {
        console.error("Error starting sensor stream:", error);
        isCycleRunning = false;
        cycleButton.textContent = 'Start Cycle';
      });
  } else {
    if (eventSource) {
      eventSource.close();  // Close the EventSource connection
    }
    
    fetch('/stop_sensors', { method: 'POST' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        console.log("Sensors stopped:", result);
        isCycleRunning = false;
        cycleButton.textContent = 'Start Cycle';
      })
      .catch(error => {
        console.error("Error stopping sensor stream:", error);
      });
  }
}

/**
 * Initializes the chart and sets up the sensor data streaming.
 */
function initializeStream() {
  if (eventSource) {
    eventSource.close();  // Close any existing connection
  }

  startTime = Date.now();
  eventSource = new EventSource('/stream');
  
  eventSource.onmessage = function(event) {
    const data = JSON.parse(event.data);
    
    // Check if we received a stop signal
    if (data.status === 'stopped') {
      eventSource.close();
      return;
    }

    // Update the sensor list
    updateSensorList(data);

    // Update chart with new data
    if (chartInstance) {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const timestamp = new Date();

      // Update each selected sensor
      selectedSensors.forEach(sensorName => {
        if (data[sensorName] !== undefined) {
          // Find or create dataset for this sensor
          let dataset = chartInstance.data.datasets.find(ds => ds.label === sensorName);
          if (!dataset) {
            dataset = {
              label: sensorName,
              data: [],
              borderColor: getRandomColor(),
              fill: false,
              pointRadius: 1
            };
            chartInstance.data.datasets.push(dataset);
          }

          dataset.data.push({
            x: elapsedSeconds,
            y: data[sensorName]
          });
        }
      });

      // Update x-axis labels
      chartInstance.options.x.ticks.callback = function(value) {
        const tickTime = new Date(startTime + value * 1000);
        return formatTime(tickTime);
      };

      chartInstance.update();
    }
  };

  eventSource.onerror = function(error) {
    console.error('EventSource failed:', error);
    eventSource.close();
    isCycleRunning = false;
    document.getElementById('StartCycle').textContent = 'Start Cycle';
  };
}

/**
 * Updates the sensor list in the UI
 * @param {Object} data - The sensor data object
 */
function updateSensorList(data) {
  // Get all sensor names from the current data
  const currentSensors = new Set(Object.keys(data).filter(key => 
    // Only include keys that have numeric values (sensors)
    typeof data[key] === 'number'
  ));
  
  // Remove sensors that are no longer present
  for (const sensor of availableSensors) {
    if (!currentSensors.has(sensor)) {
      availableSensors.delete(sensor);
      selectedSensors.delete(sensor);
    }
  }
  
  // Add new sensors
  currentSensors.forEach(sensor => availableSensors.add(sensor));
  
  // Get the sensor list element
  const sensorList = document.getElementById('sensorList');
  
  // Update the list to reflect current sensors
  sensorList.innerHTML = '';
  
  // Add each sensor to the list
  Array.from(availableSensors).sort().forEach(sensorName => {
    const div = document.createElement('div');
    div.className = 'sensor-checkbox';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = sensorName;
    checkbox.checked = selectedSensors.has(sensorName);
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        selectedSensors.add(sensorName);
      } else {
        selectedSensors.delete(sensorName);
      }
      // We'll add visualization logic here later
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
 * Creates a new Chart.js instance with the specified configuration.
 */
function createChart(ctx, datasets = [], options = {}) {
  return new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets },
    options: {
      responsive: true,
      scales: {
        x: {
          title: { display: true, text: 'Time' },
          ...options.x
        },
        y: {
          title: { display: true, text: 'Temperature (°C)' },
          ...options.y
        }
      },
      plugins: {
        annotation: {
          annotations: {}
        }
      }
    }
  });
}
