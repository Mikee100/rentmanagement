import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...', fullScreen = false }) => {
  const sizeClass = `spinner-${size}`;
  
  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className={`spinner ${sizeClass}`}></div>
        {text && <p className="loading-text">{text}</p>}
      </div>
    );
  }

  return (
    <div className="loading-inline">
      <div className={`spinner ${sizeClass}`}></div>
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;

