import React, { memo, useState } from 'react';
import PropTypes from 'prop-types';
import './Debug.css';

const Debug = memo(({ inputs, costs, isVisible = false }) => {
  const [copyStatus, setCopyStatus] = useState('idle');

  if (!isVisible) return null;

  const debugData = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    inputs: {
      annualConsumption: inputs.annualConsumption,
      preSolarOnPeak: inputs.preSolarOnPeak,
      batteryCapacity: inputs.batteryCapacity,
      solarGeneration: inputs.solarGeneration,
      ampService: inputs.ampService,
      monthlyPeakAllocation: inputs.monthlyPeakAllocation,
      monthlyConsumptionBreakdown: inputs.annualConsumption / 12,
      solarMonthlyGeneration: inputs.solarGeneration / 12,
    },
    calculations: {
      annual: {
        preSolarTotal: costs?.preSolarTotal || 0,
        postSolarTotal: costs?.postSolarTotal || 0,
        savings: (costs?.preSolarTotal || 0) - (costs?.postSolarTotal || 0),
        savingsPercentage: costs?.preSolarTotal
          ? ((costs.preSolarTotal - costs.postSolarTotal) / costs.preSolarTotal) * 100
          : 0,
        solarOffset: (inputs.solarGeneration / inputs.annualConsumption) * 100,
        averageMonthlyBill: costs?.postSolarTotal / 12,
        effectiveRate: costs?.postSolarTotal / inputs.annualConsumption,
        solarValuePerKWh:
          ((costs?.preSolarTotal || 0) - (costs?.postSolarTotal || 0)) / inputs.solarGeneration,
      },
      rates: {
        onPeak: costs?.monthlyDetails?.[0]?.energyCalculation?.onPeakRate,
        offPeak: costs?.monthlyDetails?.[0]?.energyCalculation?.offPeakRate,
        demandChargeRates: costs?.monthlyDetails?.[0]?.demandCharges?.calculation?.tiers?.map((t) => ({
          range: t.range,
          rate: t.rate,
        })),
      },
      monthly: costs?.monthlyDetails?.map((detail) => ({
        month: detail.month,
        serviceCharge: detail.serviceCharge,
        onPeakEnergyCharge: detail.onPeakEnergy,
        offPeakEnergyCharge: detail.offPeakEnergy,
        onPeakEnergyChargeAdjusted: Math.max(0, detail.onPeakEnergy),
        offPeakEnergyChargeAdjusted: Math.max(0, detail.offPeakEnergy),
        demandChargesTotal: detail.demandCharges.total,
        solarCredits: detail.solarCredits,
        totalCostCalculated: Number(
          (
            detail.serviceCharge +
            Math.max(0, detail.onPeakEnergy) +
            Math.max(0, detail.offPeakEnergy) +
            detail.demandCharges.total +
            detail.solarCredits
          ).toFixed(2)
        ),
        totalCostFromDetail: detail.totalCost,
        // Include any additional details you find necessary
        energyCalculations: detail.energyCalculation,
        demandCalculations: detail.demandCharges.calculation,
        solarCalculations: detail.solarCalculation,
      })),
    },
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      setCopyStatus('failed');
    }
  };

  return (
    <div className="debug-container">
      <h2>Debug Information</h2>
      <button onClick={handleCopy}>
        {copyStatus === 'idle' && 'Copy Debug Data'}
        {copyStatus === 'copied' && 'Copied!'}
        {copyStatus === 'failed' && 'Failed to Copy'}
      </button>
      <pre>{JSON.stringify(debugData, null, 2)}</pre>
    </div>
  );
});

Debug.propTypes = {
  inputs: PropTypes.object.isRequired,
  costs: PropTypes.object.isRequired,
  isVisible: PropTypes.bool,
};

export default Debug;
