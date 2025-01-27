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
    // Original update logic
    const temperature = parseFloat(document.getElementById('temperature').value);
    const manualPoint = document.getElementById('manualPoint').value.split(',').map(Number);

    if (!isNaN(temperature)) {
        const newX = chartInstance.data.labels.length;
        chartInstance.data.labels.push(newX);
        chartInstance.data.datasets[0].data.push({ x: newX, y: temperature });
    }

    if (manualPoint.length === 2) {
        chartInstance.data.datasets[0].data.push({ x: manualPoint[0], y: manualPoint[1] });
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