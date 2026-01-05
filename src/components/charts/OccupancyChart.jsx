import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const OccupancyChart = ({ occupied, available, maintenance, title = 'Occupancy Status' }) => {
  const total = occupied + available + maintenance;
  
  const chartData = {
    labels: ['Occupied', 'Available', 'Maintenance'],
    datasets: [
      {
        data: [occupied, available, maintenance],
        backgroundColor: [
          'rgb(22, 163, 74)',
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)'
        ],
        borderColor: [
          'rgb(22, 163, 74)',
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)'
        ],
        borderWidth: 2,
        hoverOffset: 4
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: {
          bottom: 20
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default OccupancyChart;

