export const getMonthName = (index) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[index] || 'Unknown';
};

/**
 * Estimates the peak demand based on monthly consumption.
 * @param {number} monthlyConsumption - Monthly energy consumption in kWh.
 * @returns {number} - Estimated peak demand in kW.
 */
export const estimatePeakDemand = (monthlyConsumption) => {
  // Implement a realistic estimation based on actual usage patterns
  // For simplicity, assuming peak demand is a fraction of monthly consumption
  return (monthlyConsumption / 30) / (6); // Example: average per hour during 6 on-peak hours
};

