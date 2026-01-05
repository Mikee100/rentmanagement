import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PaymentHistoryChart = ({ data, title = 'Payment History' }) => {
  const chartData = {
    labels: data.map(item => item.label),
    datasets: [
      {
        label: 'Paid',
        data: data.map(item => item.paid || 0),
        backgroundColor: 'rgba(22, 163, 74, 0.8)',
        borderColor: 'rgb(22, 163, 74)',
        borderWidth: 1
      },
      {
        label: 'Pending',
        data: data.map(item => item.pending || 0),
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 1
      },
      {
        label: 'Overdue',
        data: data.map(item => item.overdue || 0),
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderColor: 'rgb(220, 38, 38)',
        borderWidth: 1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: KSh ${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return 'KSh ' + value.toLocaleString();
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div style={{ height: '300px', position: 'relative' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default PaymentHistoryChart;

