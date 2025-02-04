import { createBaseChart, getRandomColor } from './chart-utils.js';

let chartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    fetch('/get-stored-graph-data')
        .then(response => response.json())
        .then(renderGraph)
        .catch(console.error);

    document.getElementById('updateGraph').addEventListener('click', handleUpdateGraph);
});

function handleUpdateGraph() {
  const temperature = parseFloat(document.getElementById('temperature').value);
  const manualPoint = document.getElementById('manualPoint').value.split(',').map(Number);

  if (!isNaN(temperature)) {
    const newX = chartInstance.data.labels.length;
    chartInstance.data.labels.push(newX);

    // Add a horizontal line annotation
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
    chartInstance.data.datasets[0].data.push({ x, y });

    // Add a horizontal line annotation for the manual point
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

function renderGraph(graphData) {
    const ctx = document.getElementById('newGraph').getContext('2d');
    chartInstance = createBaseChart(ctx, {
        labels: graphData.map((_, i) => i),
        datasets: [{
            label: 'Graph Data',
            data: graphData,
            borderColor: getRandomColor()
        }]
    });
}