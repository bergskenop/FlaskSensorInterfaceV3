import { createBaseChart, getRandomColor } from './chart-utils.js';

let chartInstance = null;
let setTemp = 0;

document.addEventListener('DOMContentLoaded', () => {
  // Load any stored graph data (if available) and render an initial chart.
  fetch('/get-stored-graph-data')
    .then(response => response.json())
    .then(renderGraph)
    .catch(console.error);

  // When "Start cycle" is clicked, begin the sensor stream.
  document.getElementById('StartCycle').addEventListener('click', startSensorStream);
  // When "Update Graph" is clicked, apply a manual update.
  document.getElementById('updateGraph').addEventListener('click', handleManualUpdateGraph);
});

/**
 * Starts the sensor stream by calling the server endpoint and then opening an SSE.
 */
function startSensorStream() {
  fetch('/start_sensors', { method: 'POST' })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(result => {
      console.log("Sensors started:", result);
      // Initialize the chart and open the SSE connection.
      initializeChartAndStream();
    })
    .catch(error => console.error("Error starting sensor stream:", error));
}

/**
 * Initializes the chart and sets up the sensor data streaming.
 */
function initializeChartAndStream() {
  const ctx = document.getElementById('newGraph').getContext('2d');

  // If a chart instance already exists, destroy it first.
  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Sensor 1', data: [], borderColor: getRandomColor(), fill: false },
        { label: 'Sensor 2', data: [], borderColor: getRandomColor(), fill: false },
        { label: 'Sensor 3', data: [], borderColor: getRandomColor(), fill: false },
        { label: 'Sensor 4', data: [], borderColor: getRandomColor(), fill: false }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Time' } },
        y: { title: { display: true, text: 'Temperature (°C)' } }
      }
    }
  });

  // Open an EventSource connection to stream sensor data.
  const eventSource = new EventSource('/stream');
  eventSource.onmessage = function (event) {
    const sensorData = JSON.parse(event.data);
    const currentTime = new Date().toLocaleTimeString();

    // Append the current time as label and add sensor data to each dataset.
    chartInstance.data.labels.push(currentTime);
    chartInstance.data.datasets[0].data.push(sensorData.sensor1);
    chartInstance.data.datasets[1].data.push(sensorData.sensor2);
    chartInstance.data.datasets[2].data.push(sensorData.sensor3);
    chartInstance.data.datasets[3].data.push(sensorData.sensor4);
    chartInstance.update();
  };
  chartInstance.options.plugins.annotation.annotations = {
      type: 'line',
      yMin: setTemp,
      yMax: setTemp,
      borderColor: getRandomColor(),
      borderWidth: 2,
      label: {
        content: `Temperature at ${setTemp}°C`,
        enabled: true,
        position: 'end'
      }
    };

  eventSource.onerror = function (error) {
    console.error("EventSource error:", error);
    eventSource.close();
  };

  // Disable the Start cycle button so the stream is not restarted.
  document.getElementById('StartCycle').disabled = true;
}

/**
 * Handles manual updates to the graph using user input.
 */
function handleManualUpdateGraph() {
  const temperature = parseFloat(document.getElementById('temperature').value);
  setTemp = temperature;
  const manualPoint = document.getElementById('manualPoint').value.split(',').map(Number);

  if (!isNaN(temperature)) {
    const newX = chartInstance.data.labels.length;
    chartInstance.data.labels.push(newX);

    // Ensure the annotation plugin object exists.
    if (!chartInstance.options.plugins.annotation) {
      chartInstance.options.plugins.annotation = { annotations: {} };
    }
    chartInstance.options.plugins.annotation.annotations[`line${newX}`] = {
      type: 'line',
      yMin: temperature,
      yMax: temperature,
      borderColor: getRandomColor(),
      borderWidth: 2,
      label: {
        content: `Temperature at ${temperature}°C`,
        enabled: true,
        position: 'end'
      }
    };
  }

  if (manualPoint.length === 2) {
    const [x, y] = manualPoint;
    // Adding a manual data point to the first dataset as an example.
    chartInstance.data.datasets[0].data.push({ x, y });

    if (!chartInstance.options.plugins.annotation) {
      chartInstance.options.plugins.annotation = { annotations: {} };
    }
    chartInstance.options.plugins.annotation.annotations[`manualLine${x}`] = {
      type: 'line',
      yMin: y,
      yMax: y,
      borderColor: getRandomColor(),
      borderWidth: 2,
      label: {
        content: `Manual Point at ${y}°C`,
        enabled: true,
        position: 'end'
      }
    };
  }

  chartInstance.update();
}

/**
 * Renders the graph using pre-stored graph data.
 */
function renderGraph(response) {
  const ctx = document.getElementById('newGraph').getContext('2d');
  const graphData = response.data;
  const config = response.config;

  // If a chart instance already exists, destroy it.
  if (chartInstance) {
    chartInstance.destroy();
  }

  if (graphData.length === 1) {
    const temperature = graphData[0].y;
    const maxY = temperature * 1.5;
    const xRange = Math.abs(1.5 * config.max_rico * (temperature - 20));

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: xRange,
            title: { display: true, text: 'Time (seconds)' }
          },
          y: {
            min: 0,
            max: maxY,
            title: { display: true, text: 'Temperature (°C)' }
          }
        },
        plugins: {
          annotation: {
            annotations: {
              targetTemp: {
                type: 'line',
                yMin: temperature,
                yMax: temperature,
                borderColor: getRandomColor(),
                borderWidth: 2,
                label: {
                  content: `Target Temperature: ${temperature}°C`,
                  enabled: true,
                  position: 'end'
                }
              }
            }
          }
        }
      }
    });
  } else {
    // Original multi-point graph rendering.
    chartInstance = createBaseChart(ctx, {
      labels: graphData.map((_, i) => i),
      datasets: [{
        label: 'Graph Data',
        data: graphData,
        borderColor: getRandomColor()
      }]
    });
  }

  chartInstance.update();
}
