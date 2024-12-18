import { getMonthName, validateInputs, lookupPeakDemand } from './helpers';

// Add this with the other constants at the top of the file
const PEAK_HOURS_COUNT = {
  Winter: 3,     // 4 morning + 4 evening
  Summer: 3,     // 2pm to 8pm
};

export const DAYS_PER_MONTH = 22;

// Monthly consumption weights (percentage of annual consumption)
const MONTHLY_CONSUMPTION_WEIGHTS = [
  7.13,    // January
  6.19,    // February
  5.35,    // March
  5.48,    // April
  7.15,    // May
  10.09,   // June
  14.13,   // July
  14.17,   // August
  11.62,   // September
  8.43,    // October
  4.74,    // November
  5.52     // December (adjusted to make total exactly 100)
];

// Helper function to verify weights
const verifyWeights = () => {
  const weightSum = MONTHLY_CONSUMPTION_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  if (Math.abs(weightSum - 100) > 0.01) {  // Allow for small floating point differences
    throw new Error('Monthly consumption weights must sum to 100');
  }
};

// Energy rates per season including all components
const RATES = {
  Summer: {
    onPeak: 0.14227,    // 6.63¢/kWh (2pm-8pm)
    offPeak: 0.05943    // 5.61¢/kWh (all other hours)
  },
  Winter: {
    onPeak: 0.09932,    // 6.74¢/kWh (5am-9am & 5pm-9pm)
    offPeak: 0.05938    // 6.34¢/kWh (all other hours)
  }
};

// Service charges based on amp service
const SERVICE_CHARGES = {
  200: { total: 32.44 },  // 0-200 Amp
  201: { total: 45.44 }   // 200+ Amp
};

// Demand charge tiers per season
const DEMAND_TIERS = {
  Winter: [
    { limit: Infinity, rate: 13.747 }
  ],
  Summer: [
    { limit: Infinity, rate: 19.585 }
  ],
};

// Season mapping
const MONTH_SEASONS = [
  'Winter', 'Winter', 'Winter', 'Winter',      // Jan - Apr
  'Summer', 'Summer',                          // May - Jun
  'Summer', 'Summer',                 // Jul - Aug
  'Summer', 'Summer',                          // Sep - Oct
  'Winter', 'Winter'                           // Nov - Dec
];

// Add these constants at the top with other constants
const MONTHLY_SOLAR_PERCENTAGES = [
  7.31,   // January
  10.90,  // February
  12.23,  // March
  13.22,  // April
  13.67,  // May
  15.23,  // June
  15.11,  // July
  14.15,  // August
  10.80,  // September
  6.93,   // October
  5.01,   // November
  4.46    // December
];

// Credit rates for excess generation (E-27)
const SOLAR_CREDIT_RATES = {
  Summer: {
    onPeak: 0.09932,   
    offPeak: 0.05938   
  },
  Winter: {
    onPeak: 0.14227,   
    offPeak: 0.05943   
  }
};

const calculateSolarCredits = ({
  productionOnPeak,
  productionOffPeak,
  consumptionOnPeak,
  consumptionOffPeak,
  season
}) => {
  const creditRates = SOLAR_CREDIT_RATES[season];
  
  // Calculate excess production
  const excessOnPeak = Math.max(0, productionOnPeak - consumptionOnPeak);
  const excessOffPeak = Math.max(0, productionOffPeak - consumptionOffPeak);
  
  // Calculate credits using the credit rates
  const onPeakCredit = excessOnPeak * creditRates.onPeak;
  const offPeakCredit = excessOffPeak * creditRates.offPeak;
  
  return {
    onPeak: {
      kWh: excessOnPeak,
      rate: creditRates.onPeak,
      credit: onPeakCredit
    },
    offPeak: {
      kWh: excessOffPeak,
      rate: creditRates.offPeak,
      credit: offPeakCredit
    },
    total: onPeakCredit + offPeakCredit
  };
};

const calculateMonthlyBill = ({
  consumption,
  solar,
  rates,
  season,
  batteryCapacity,
  preSolarOnPeakPercentage,
  carryoverCredits = 0
}) => {
  // Calculate net consumption
  const netAmount = solar - consumption;
  const excessProduction = Math.max(0, netAmount);
  const remainingConsumption = Math.max(0, -netAmount);

  // Calculate solar credits considering battery capacity
  const solarCredits = calculateSolarCredits({
    excessProduction,
    batteryCapacity,
    preSolarOnPeakPercentage,
    season
  });

  return {
    energyCharges: {
      onPeak: remainingConsumption * SEASONAL_PEAK_USAGE[season] * rates.onPeak,
      offPeak: remainingConsumption * (1 - SEASONAL_PEAK_USAGE[season]) * rates.offPeak,
      total: (remainingConsumption * SEASONAL_PEAK_USAGE[season] * rates.onPeak) + 
             (remainingConsumption * (1 - SEASONAL_PEAK_USAGE[season]) * rates.offPeak)
    },
    solarCalculation: {
      monthlyConsumption: consumption,
      monthlySolar: solar,
      netAmount,
      excessProduction,
      batteryStorage: solarCredits.batteryStorage,
      onPeak: solarCredits.onPeak,
      offPeak: solarCredits.offPeak
    },
    solarCredits: solarCredits.total + carryoverCredits,
    excessProduction
  };
};

export const calculateCosts = ({
  annualConsumption,
  monthlyPeakAllocation,
  batteryCapacity,
  solarGeneration,
  ampService
}) => {
  // Verify weights first
  verifyWeights();

  // Validate inputs first
  validateInputs({
    annualConsumption,
    monthlyPeakAllocation,
    batteryCapacity,
    solarGeneration,
    ampService
  });

  const selectedServiceCharge = SERVICE_CHARGES[ampService];
  const monthlyDetails = [];
  const totals = {
    monthlyServiceCharges: 0,
    energyCharges: 0,
    demandCharges: 0,
    solarCredits: 0,
    monthlyCosts: 0
  };

  let totalOnPeakCredits = 0;
  let totalOffPeakCredits = 0;

  // Calculate monthly consumptions using weights
  const monthlyConsumptions = MONTHLY_CONSUMPTION_WEIGHTS.map(weight => 
    annualConsumption * (weight / 100)
  );

  // Process each month
  monthlyConsumptions.forEach((consumption, index) => {
    const season = MONTH_SEASONS[index];
    const currentRates = RATES[season];
    
    // Calculate solar generation for this month
    const monthlySolarPercentage = MONTHLY_SOLAR_PERCENTAGES[index] / 100;
    const monthlySolar = solarGeneration * monthlySolarPercentage;
    
    // Calculate net consumption after solar
    const netAmount = consumption - monthlySolar;
    const remainingConsumption = Math.max(0, netAmount);
    const excessProduction = Math.abs(Math.min(0, netAmount));

    // Get the pre-solar on-peak percentage for this month
    const preSolarOnPeakPercentage = monthlyPeakAllocation[index].onPeak / 100;
    
    // Calculate monthly battery capacity
    const monthlyBatteryCapacity = batteryCapacity * DAYS_PER_MONTH;
    
    // First, fill battery using monthly capacity
    const batteryFill = Math.min(excessProduction, monthlyBatteryCapacity);
    const remainingExcess = Math.max(0, excessProduction - monthlyBatteryCapacity);

    // Use E-27 credit rates for remaining excess
    const creditRates = SOLAR_CREDIT_RATES[season];
    
    // Calculate credits only for remaining excess after battery
    const excessOnPeakKWh = remainingExcess * preSolarOnPeakPercentage;
    const excessOffPeakKWh = remainingExcess * (1 - preSolarOnPeakPercentage);
    
    const onPeakCredits = excessOnPeakKWh * creditRates.onPeak;
    const offPeakCredits = excessOffPeakKWh * creditRates.offPeak;
    const solarCredits = onPeakCredits + offPeakCredits;

    // Calculate energy charges for remaining consumption
    const postSolarOnPeakPercentage = preSolarOnPeakPercentage;
    const postSolarOffPeakPercentage = 1 - postSolarOnPeakPercentage;

    const onPeakConsumption = consumption * SEASONAL_PEAK_USAGE[season];
    const onPeakProduction = monthlySolar * PEAK_SOLAR_PRODUCTION[index];

    // Calculate initial net on-peak consumption
    let netOnPeakConsumption = onPeakConsumption - onPeakProduction;
    let batteryForOffPeak = monthlyBatteryCapacity;

    if (netOnPeakConsumption < 0) {
        // We have excess on-peak production (-87 kWh)
        const absExcess = Math.abs(netOnPeakConsumption); // 87 kWh
        batteryForOffPeak = monthlyBatteryCapacity + absExcess; // 220 + 87 = 307 kWh
        // Keep the negative value for credits
        netOnPeakConsumption = -absExcess; // -87 kWh
    } else if (netOnPeakConsumption > 0) {
        if (netOnPeakConsumption <= monthlyBatteryCapacity) {
            batteryForOffPeak = monthlyBatteryCapacity - netOnPeakConsumption;
            netOnPeakConsumption = 0;
        } else {
            netOnPeakConsumption -= monthlyBatteryCapacity;
            batteryForOffPeak = 0;
        }
    }

    const onPeakEnergy = netOnPeakConsumption * currentRates.onPeak;

    const offPeakConsumption = consumption * (1 - SEASONAL_PEAK_USAGE[season]);
    const offPeakProduction = monthlySolar * (1 - PEAK_SOLAR_PRODUCTION[index]);

    // Add battery allocation to off-peak
    const netOffPeakConsumption = offPeakConsumption - offPeakProduction + batteryForOffPeak;
    const offPeakEnergy = netOffPeakConsumption * currentRates.offPeak;

    const energyCalculation = {
      monthlyConsumption: consumption,
      onPeakConsumption,
      onPeakProduction,
      netOnPeakConsumption,
      onPeakRate: currentRates.onPeak,
      offPeakConsumption,
      offPeakProduction,
      netOffPeakConsumption,
      offPeakRate: currentRates.offPeak
    };

    // Debug logging
    console.group(`Month: ${getMonthName(index)}`);
    console.log('Monthly Consumption:', consumption.toFixed(2), 'kWh');
    console.log('Solar Production %:', (MONTHLY_SOLAR_PERCENTAGES[index]).toFixed(2) + '%');
    console.log('Monthly Solar:', monthlySolar.toFixed(2), 'kWh');
    console.log('Net Amount:', netAmount.toFixed(2), 'kWh');
    console.log('Remaining Consumption:', remainingConsumption.toFixed(2), 'kWh');
    console.log('Excess Production:', excessProduction.toFixed(2), 'kWh');
    console.log('Pre-Solar On-Peak %:', (preSolarOnPeakPercentage * 100).toFixed(2) + '%');
    console.log('Post-Solar On-Peak %:', (postSolarOnPeakPercentage * 100).toFixed(2) + '%');
    console.log('On-Peak Energy Cost:', onPeakEnergy.toFixed(2));
    console.log('Off-Peak Energy Cost:', offPeakEnergy.toFixed(2));
    console.log('Solar Credits:', solarCredits.toFixed(2));
    console.groupEnd();

    // Get peak demand from lookup table for current season
    console.log('Calling lookupPeakDemand with:', { annualConsumption, batteryCapacity, season });
    const peakDemandKW = lookupPeakDemand(annualConsumption, batteryCapacity, season);
    console.log('Returned peak demand:', peakDemandKW);

    // Calculate demand charges
    const demandCharges = {
      peakDemand: peakDemandKW,
      total: calculateDemandCharge(peakDemandKW, season).total,
      calculation: {
        monthlyConsumption: consumption,
        season,
        batteryCapacity,
        peakDemand: peakDemandKW,
        tiers: calculateDemandCharge(peakDemandKW, season).tiers
      }
    };

    // Store the monthly details
    monthlyDetails.push({
      month: getMonthName(index),
      serviceCharge: selectedServiceCharge.total,
      onPeakEnergy: Number((netOnPeakConsumption * currentRates.onPeak).toFixed(2)),
      offPeakEnergy: Number((netOffPeakConsumption * currentRates.offPeak).toFixed(2)),
      energyCalculation,
      demandCharges,
      solarCredits: Number((Math.abs(onPeakCredits) + Math.abs(offPeakCredits)).toFixed(2)),
      totalCost: Number((
        selectedServiceCharge.total + 
        Math.max(0, netOnPeakConsumption * currentRates.onPeak) + 
        Math.max(0, netOffPeakConsumption * currentRates.offPeak) + 
        demandCharges.total - 
        (Math.abs(onPeakCredits) + Math.abs(offPeakCredits))
      ).toFixed(2)),
      solarCalculation: {
        monthlyConsumption: consumption,
        monthlySolar,
        netAmount,
        excessProduction,
        batteryStorage: {
          kWh: batteryFill,
          capacity: monthlyBatteryCapacity
        },
        onPeak: {
          kWh: Number(excessOnPeakKWh.toFixed(2)),
          rate: creditRates.onPeak,
          credit: Number(onPeakCredits.toFixed(2))
        },
        offPeak: {
          kWh: Number(excessOffPeakKWh.toFixed(2)),
          rate: creditRates.offPeak,
          credit: Number(offPeakCredits.toFixed(2))
        }
      }
    });

    // Update totals
    totals.monthlyServiceCharges += selectedServiceCharge.total;
    totals.energyCharges += Math.max(0, onPeakEnergy + offPeakEnergy);
    totals.demandCharges += demandCharges.total;

    // Use existing values for credit calculation
    const postBatteryOffPeak = Math.round(offPeakConsumption - offPeakProduction + batteryForOffPeak);
    totals.solarCredits = Math.abs(totalOnPeakCredits + totalOffPeakCredits);
    totals.monthlyCosts = -totals.solarCredits;

    // Add after existing debug logging
    console.log('Peak Calculations:', {
      season,
      initialPeakUsage: SEASONAL_PEAK_USAGE[season],
      peakSolarProduction: PEAK_SOLAR_PRODUCTION[index],
      preSolarPeakUsage: remainingConsumption * SEASONAL_PEAK_USAGE[season],
      postSolarPeakUsage: remainingConsumption * (1 - SEASONAL_PEAK_USAGE[season]),
      postSolarOnPeakPercentage: (postSolarOnPeakPercentage * 100).toFixed(2) + '%'
    });

    totalOnPeakCredits += onPeakCredits;
    totalOffPeakCredits += offPeakCredits;
  });

  return {
    monthlyDetails,
    totals: {
      monthlyServiceCharges: Number(totals.monthlyServiceCharges.toFixed(2)),
      energyCharges: Number(totals.energyCharges.toFixed(2)),
      demandCharges: Number(totals.demandCharges.toFixed(2)),
      solarCredits: Number(totals.solarCredits.toFixed(2)),
      monthlyCosts: Number((-totals.solarCredits).toFixed(2))  // Will show -56.24
    },
    preSolarTotal: Number(totals.monthlyCosts.toFixed(2)),
    postSolarTotal: Number((-totals.solarCredits).toFixed(2))
  };
};

// Helper function to calculate demand charge based on tiers
const calculateDemandCharge = (peakDemandKW, season) => {
  const tiers = DEMAND_TIERS[season];
  let totalCharge = 0;
  let remainingDemand = peakDemandKW;
  const tierCalculations = [];

  for (let i = 0; i < tiers.length && remainingDemand > 0; i++) {
    const tier = tiers[i];
    const prevLimit = i === 0 ? 0 : tiers[i - 1].limit;
    const demandInTier = Math.min(remainingDemand, tier.limit - prevLimit);
    const tierCharge = demandInTier * tier.rate;
    
    tierCalculations.push({
      range: `${prevLimit}-${tier.limit} kW`,
      kw: demandInTier,
      rate: tier.rate,
      charge: tierCharge
    });

    totalCharge += tierCharge;
    remainingDemand -= demandInTier;
  }

  return {
    total: totalCharge,
    tiers: tierCalculations
  };
};

const SEASONAL_PEAK_USAGE = {
  Winter: 0.2,      // 25% peak usage in winter
  Summer: 0.25,      // 30% peak usage in summer
};

export const PEAK_SOLAR_PRODUCTION = {
  0: 0.0443,  // January
  1: 0.0679,  // February
  2: 0.0988,  // March
  3: 0.1315,  // April
  4: 0.3555,  // May
  5: 0.3636,  // June
  6: 0.3654,  // July
  7: 0.3609,  // August
  8: 0.3311,  // September
  9: 0.2982,  // October
  10: 0.0656, // November
  11: 0.0511  // December
};

export const getMonthIndex = (monthName) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December'];
  return months.indexOf(monthName);
};
