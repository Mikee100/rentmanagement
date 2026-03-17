import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Phone, Search, UserCircle2 } from 'lucide-react';
import { apartmentsAPI } from '../services/api';
import './Apartments.css';

const Apartments = () => {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter((a) => {
      const hay = [
        a?.name,
        a?.address,
        a?.description,
        a?.manager?.name,
        a?.manager?.phone,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [apartments, query]);

  const totals = useMemo(() => {
    return apartments.reduce(
      (acc, a) => {
        acc.totalBuildings += 1;
        acc.totalHouses += a?.totalHouses || 0;
        acc.occupied += a?.occupiedHouses || 0;
        acc.available += a?.availableHouses || 0;
        return acc;
      },
      { totalBuildings: 0, totalHouses: 0, occupied: 0, available: 0 }
    );
  }, [apartments]);

  if (loading) return <div className="loading">Loading apartments...</div>;

  return (
    <div className="apartments-list">
      <header className="apartments-hero">
        <div className="apartments-hero-top">
          <div className="hero-title">
            <div className="hero-icon">
              <Building2 size={20} />
            </div>
            <div className="hero-text">
              <h1>Apartments</h1>
              <p className="hero-subtitle">Browse buildings and quickly see occupancy at a glance.</p>
            </div>
          </div>

          <div className="hero-search" role="search">
            <Search size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, address, manager..."
              aria-label="Search apartments"
            />
          </div>
        </div>

        <div className="apartments-kpis">
          <div className="kpi">
            <span className="kpi-label">Buildings</span>
            <span className="kpi-value">{totals.totalBuildings}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Houses</span>
            <span className="kpi-value">{totals.totalHouses}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Occupied</span>
            <span className="kpi-value danger">{totals.occupied}</span>
          </div>
          <div className="kpi">
            <span className="kpi-label">Available</span>
            <span className="kpi-value success">{totals.available}</span>
          </div>
        </div>
      </header>

      <div className="apartments-grid">
        {filtered.length === 0 ? (
          <div className="apartments-empty card-premium">
            <div className="empty-icon">
              <Building2 size={26} />
            </div>
            <h2>No apartments found</h2>
            <p>Try a different search, or clear the filter to see all buildings.</p>
            <button className="btn-secondary" onClick={() => setQuery('')}>Clear search</button>
          </div>
        ) : (
          filtered.map((apartment) => {
            const total = apartment.totalHouses || 0;
            const occupied = apartment.occupiedHouses || 0;
            const available = apartment.availableHouses || 0;
            const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

            return (
              <article key={apartment._id} className="apartment-card card-premium">
                <div className="apartment-card-head">
                  <div className="apartment-name-row">
                    <h2 className="apartment-name">{apartment.name}</h2>
                    <span className={`occupancy-pill ${occupancyPct >= 90 ? 'high' : occupancyPct >= 60 ? 'mid' : 'low'}`}>
                      {occupancyPct}% occupied
                    </span>
                  </div>

                  <div className="apartment-meta">
                    <span className="meta-item" title={apartment.address || ''}>
                      <MapPin size={14} />
                      <span className="meta-text">{apartment.address || '—'}</span>
                    </span>
                  </div>
                </div>

                {apartment.description && (
                  <p className="apartment-description">{apartment.description}</p>
                )}

                <div className="apartment-stats">
                  <div className="stat">
                    <span className="stat-label">Houses</span>
                    <span className="stat-value">{total}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Occupied</span>
                    <span className="stat-value danger">{occupied}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Available</span>
                    <span className="stat-value success">{available}</span>
                  </div>
                </div>

                <div className="occupancy-bar" aria-hidden="true">
                  <div className="occupancy-bar-fill" style={{ width: `${Math.min(100, Math.max(0, occupancyPct))}%` }} />
                </div>

                {apartment.manager && (
                  <div className="apartment-manager">
                    <div className="manager-line">
                      <UserCircle2 size={16} />
                      <span className="manager-name">{apartment.manager.name || 'Manager'}</span>
                    </div>
                    {apartment.manager.phone && (
                      <div className="manager-line muted">
                        <Phone size={16} />
                        <span>{apartment.manager.phone}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="apartment-action">
                  <button
                    className="btn-view"
                    onClick={() => navigate(`/apartments/${apartment._id}`)}
                  >
                    View houses
                    <span className="btn-view-arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Apartments;
