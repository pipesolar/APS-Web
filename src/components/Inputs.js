// src/components/Inputs.js
import React, { memo } from 'react';
import PropTypes from 'prop-types';
import './Inputs.css';

const InputSlider = memo(({ 
  label, 
  name, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit = '', 
  disabled = false 
}) => (
  <div className="input-group">
    <label className="input-label">
      {label}
      <div className="input-with-slider">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(name, e.target.value)}
          disabled={disabled}
        />
        <div className="value-display">
          {typeof value === 'number' ? value.toLocaleString() : value}
          {unit}
        </div>
      </div>
    </label>
  </div>
));

const Inputs = ({ inputs, onInputChange, disabled }) => {
  return (
    <div className="inputs-container">
      <div className="inputs-column">
        <InputSlider
          label="Annual Consumption (kWh)"
          name="annualConsumption"
          value={inputs.annualConsumption}
          onChange={onInputChange}
          min={1000}
          max={50000}
          step={100}
          disabled={disabled}
        />

        <InputSlider
          label="Pre-Solar On-Peak (%)"
          name="preSolarOnPeak"
          value={inputs.preSolarOnPeak}
          onChange={onInputChange}
          min={0}
          max={100}
          unit="%"
          disabled={disabled}
        />

        <InputSlider
          label="Post-Solar On-Peak (%)"
          name="postSolarOnPeak"
          value={inputs.postSolarOnPeak}
          onChange={onInputChange}
          min={0}
          max={100}
          unit="%"
          disabled={disabled}
        />
      </div>

      <div className="inputs-column">
        <InputSlider
          label="Battery Capacity (kWh)"
          name="batteryCapacity"
          value={inputs.batteryCapacity}
          onChange={onInputChange}
          min={0}
          max={50}
          step={0.5}
          disabled={disabled}
        />

        <InputSlider
          label="Solar Generation (kWh)"
          name="solarGeneration"
          value={inputs.solarGeneration}
          onChange={onInputChange}
          min={0}
          max={100000}
          step={100}
          disabled={disabled}
        />

        <div className="input-group amp-service">
          <label className="input-label">Amp Service Level</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="ampService"
                value={200}
                checked={inputs.ampService === 200}
                onChange={(e) => onInputChange('ampService', e.target.value)}
                disabled={disabled}
              />
              0-200 Amp
            </label>
            <label>
              <input
                type="radio"
                name="ampService"
                value={201}
                checked={inputs.ampService === 201}
                onChange={(e) => onInputChange('ampService', e.target.value)}
                disabled={disabled}
              />
              200+ Amp
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

InputSlider.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  step: PropTypes.number,
  unit: PropTypes.string,
  disabled: PropTypes.bool,
};

Inputs.propTypes = {
  inputs: PropTypes.shape({
    annualConsumption: PropTypes.number.isRequired,
    preSolarOnPeak: PropTypes.number.isRequired,
    postSolarOnPeak: PropTypes.number.isRequired,
    batteryCapacity: PropTypes.number.isRequired,
    solarGeneration: PropTypes.number.isRequired,
    ampService: PropTypes.number.isRequired,
  }).isRequired,
  onInputChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default memo(Inputs);
