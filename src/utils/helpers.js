// Constants for validation
const INPUT_CONSTRAINTS = {
  annualConsumption: { min: 15000, max: 51000 },
  preSolarOnPeak: { min: 0, max: 100 },
  postSolarOnPeak: { min: 0, max: 100 },
  batteryCapacity: { min: 0, max: 50 },
  solarGeneration: { min: 0, max: 100000 },
  ampService: { valid: [200, 201] }
};

export const validateInputs = ({
  annualConsumption,
  monthlyPeakAllocation,
  batteryCapacity,
  solarGeneration,
  ampService
}) => {
  if (!Array.isArray(monthlyPeakAllocation) || monthlyPeakAllocation.length !== 12) {
    throw new Error('Monthly peak allocation must be an array of 12 months');
  }

  monthlyPeakAllocation.forEach((month, index) => {
    if (typeof month.onPeak !== 'number' || month.onPeak < 0 || month.onPeak > 100) {
      throw new Error(`Invalid on-peak percentage for ${month.month}: must be between 0 and 100`);
    }
  });

  if (annualConsumption < 15000 || annualConsumption > 51000) {
    throw new Error('Annual consumption must be between 15,000 and 51,000 kWh');
  }

  if (batteryCapacity < 0 || batteryCapacity > 50) {
    throw new Error('Battery capacity must be between 0 and 50 kWh');
  }

  if (solarGeneration < 0) {
    throw new Error('Solar generation must be positive');
  }

  if (ampService !== 200 && ampService !== 201) {
    throw new Error('Amp service must be either 200 or 201');
  }
};

export const getMonthName = (index) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[index] || 'Unknown';
};

const PEAK_HOURS = {
  Winter: {
    afternoon: { start: 16, end: 19 }  // 4pm-7pm
  },
  Summer: {
    afternoon: { start: 16, end: 19 }  // 4pm-7pm
  }
};

// Battery capacity sizes in kWh
const BATTERY_SIZES = [5, 10, 15, 20, 25, 30, 35, 40, 45];

// Demand lookup tables by season
const DEMAND_LOOKUP = {
  Summer: {
    consumption: [15000, 18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000, 42000, 45000, 48000, 51000],
    batteries: {
      0: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],    // No battery
      5: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],       // 5kWh
      10: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],        // 10kWh
      15: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 11],           // 15kWh
      20: [0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],           // 20kWh
      25: [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],            // 25kWh
      30: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8],            // 30kWh
      35: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7],            // 35kWh
      40: [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6],            // 40kWh
      45: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5]             // 45kWh
    }
  },
  Winter: {
    consumption: [15000, 18000, 21000, 24000, 27000, 30000, 33000, 36000, 39000, 42000, 45000, 48000, 51000],
    batteries: {
      0: [3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16],
      5: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
      10: [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
      15: [0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      20: [0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8],
      25: [0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7],
      30: [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6],
      35: [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5],
      40: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4],
      45: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3]
    }
  }
};

export const lookupPeakDemand = (annualConsumption, batteryCapacity, season) => {
  const table = DEMAND_LOOKUP[season];
  if (!table) {
    throw new Error(`Invalid season: ${season}`);
  }

  // Find the consumption index
  let consumptionIndex = 0;
  for (let i = 0; i < table.consumption.length; i++) {
    if (annualConsumption <= table.consumption[i]) {
      consumptionIndex = i;
      break;
    }
  }
  
  // Find the closest battery capacity that's less than or equal to the input
  const batteryKeys = Object.keys(table.batteries)
    .map(Number)
    .sort((a, b) => a - b);
  
  let selectedBattery = batteryKeys[0];
  for (const capacity of batteryKeys) {
    if (capacity <= batteryCapacity) {
      selectedBattery = capacity;
    } else {
      break;
    }
  }

  // Return the demand value
  return table.batteries[selectedBattery][consumptionIndex];
};

// Helper function to find closest index in array
const findClosestIndex = (arr, value) => {
  let closest = 0;
  let minDiff = Math.abs(arr[0] - value);
  
  for (let i = 1; i < arr.length; i++) {
    const diff = Math.abs(arr[i] - value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  
  return closest;
};

// Helper function to find closest value in array
const findClosestValue = (arr, value) => {
  return arr.reduce((prev, curr) => {
    return Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev;
  });
};
