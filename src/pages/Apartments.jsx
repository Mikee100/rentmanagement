import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apartmentsAPI } from '../services/api';
import './Apartments.css';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApartments();
  }, []);

  const fetchApartments = async () => {
    try {
      const response = await apartmentsAPI.getAll();
      setApartments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching apartments:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading apartments...</div>;
  }

  return (
    <div className="apartments-list">
      <div className="page-header">
        <h1>Apartments</h1>
      </div>

      <div className="apartments-grid">
        {apartments.map((apartment) => (
          <div
            key={apartment._id}
            className="apartment-card"
            onClick={() => navigate(`/apartments/${apartment._id}`)}
          >
            <div className="apartment-header">
              <h2>{apartment.name}</h2>
            </div>
            <div className="apartment-info">
              <p className="address">{apartment.address}</p>
              {apartment.description && (
                <p className="description">{apartment.description}</p>
              )}
            </div>
            <div className="apartment-stats">
              <div className="stat">
                <span className="stat-label">Total Houses:</span>
                <span className="stat-value">{apartment.totalHouses || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Occupied:</span>
                <span className="stat-value occupied">{apartment.occupiedHouses || 0}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Available:</span>
                <span className="stat-value available">{apartment.availableHouses || 0}</span>
              </div>
            </div>
            {apartment.manager && (
              <div className="apartment-manager">
                <p><strong>Manager:</strong> {apartment.manager.name}</p>
                <p>{apartment.manager.phone}</p>
              </div>
            )}
            <div className="apartment-action">
              <button className="btn-view">View Houses →</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Apartments;
