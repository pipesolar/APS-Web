export const SOLAR_CREDIT_RATES = {
  Summer: {
    onPeak: 0.14227,    // $0.0663/kWh
    offPeak: 0.05943    // $0.0561/kWh
  },
  Winter: {
    onPeak: 0.09932,    // $0.0674/kWh
    offPeak: 0.05938    // $0.0634/kWh
  }
};

export const SEASONAL_PEAK_USAGE = {
  SUMMER: 0.25,      // 30% on-peak for summer
  WINTER: 0.2       // 25% on-peak for winter
};
