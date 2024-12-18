<div className="form-group">
  <label htmlFor="batteryCapacity">Battery Capacity (kWh)</label>
  <select
    id="batteryCapacity"
    name="batteryCapacity"
    value={inputs.batteryCapacity}
    onChange={handleInputChange}
    className="form-control"
  >
    {Array.from({ length: 48 }, (_, i) => i + 3).map(value => (
      <option key={value} value={value}>
        {value} kWh
      </option>
    ))}
  </select>
</div> 