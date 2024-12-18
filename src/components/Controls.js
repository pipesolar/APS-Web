import React from 'react';
import PropTypes from 'prop-types';
import './Controls.css';

const MONTHLY_WEIGHTS = [
  0.0713, // January
  0.0619, // February
  0.0535, // March
  0.0548, // April
  0.0715, // May
  0.1009, // June
  0.1413, // July
  0.1417, // August
  0.1162, // September
  0.0843, // October
  0.0474, // November
  0.0596  // December
];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const Controls = ({ inputs, onInputChange, onCalculate, isCalculating }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onInputChange(name, value);
  };

  return (
    <div className="controls">
      <div className="input-group">
        <label htmlFor="annualConsumption">
          Annual Consumption (kWh)
          <input
            type="number"
            id="annualConsumption"
            name="annualConsumption"
            value={inputs.annualConsumption}
            onChange={handleChange}
            min="15000"
            max="51000"
          />
        </label>

        <details className="distribution-details">
          <summary className="distribution-summary">
            Monthly Distribution
            <span className="monthly-average">{Math.round(inputs.annualConsumption / 12).toLocaleString()} kWh/month avg</span>
          </summary>
          <div className="distribution-content">
            <div className="monthly-grid">
              {MONTHLY_WEIGHTS.map((weight, index) => {
                const monthlyValue = Math.round(inputs.annualConsumption * weight);
                return (
                  <div key={index} className="month-item">
                    <span className="month-name">{MONTHS[index].slice(0, 3)}</span>
                    <span className="month-value">{monthlyValue.toLocaleString()} kWh</span>
                  </div>
                );
              })}
            </div>
          </div>
        </details>

        <label htmlFor="solarGeneration">
          Annual Solar Generation (kWh)
          <input
            type="number"
            id="solarGeneration"
            name="solarGeneration"
            value={inputs.solarGeneration}
            onChange={handleChange}
            min="0"
            max="100000"
          />
        </label>

        <label htmlFor="batteryCapacity">
          Battery Capacity (kWh)
          <input
            type="number"
            id="batteryCapacity"
            name="batteryCapacity"
            value={inputs.batteryCapacity}
            onChange={handleChange}
            min="0"
            max="50"
          />
        </label>

        <label htmlFor="ampService">
          Amp Service
          <select
            id="ampService"
            name="ampService"
            value={inputs.ampService}
            onChange={handleChange}
          >
            <option value="200">200 Amp</option>
            <option value="201">200+ Amp</option>
          </select>
        </label>
      </div>

      <button 
        onClick={onCalculate}
        disabled={isCalculating}
      >
        {isCalculating ? 'Calculating...' : 'Calculate'}
      </button>
    </div>
  );
};

Controls.propTypes = {
  inputs: PropTypes.shape({
    annualConsumption: PropTypes.number.isRequired,
    preSolarOnPeak: PropTypes.number.isRequired,
    batteryCapacity: PropTypes.number.isRequired,
    solarGeneration: PropTypes.number.isRequired,
    ampService: PropTypes.number.isRequired,
  }).isRequired,
  onInputChange: PropTypes.func.isRequired,
  onCalculate: PropTypes.func.isRequired,
  isCalculating: PropTypes.bool.isRequired,
};

export default Controls;
