// src/components/Results.js
import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import './Results.css';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { MONTHLY_WEIGHTS } from '../utils/constants';
import { getMonthName } from '../utils/helpers';
import { getMonthIndex } from '../utils/calculations';
import { PEAK_SOLAR_PRODUCTION } from '../utils/calculations';
import { SEASONAL_PEAK_USAGE } from '../utils/constants';
import { DAYS_PER_MONTH } from '../utils/calculations';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getSeasonFromMonth = (month) => {
  const monthIndex = getMonthIndex(month);
  if ([4, 5, 6, 7, 8, 9].includes(monthIndex)) {
    return 'SUMMER';
  } 
  else { // November-April
    return 'WINTER';
  }
};

const Results = React.memo(({ 
  costs, 
  ampService, 
  annualConsumption, 
  solarGeneration,
  monthlyPeakAllocation
}) => {
  // Prepare chart data
  const chartData = useMemo(() => {
    if (!costs?.monthlyDetails) return null;

    return {
      labels: costs.monthlyDetails.map(detail => detail.month),
      datasets: [
        {
          label: 'Service Charge',
          data: costs.monthlyDetails.map(detail => detail.serviceCharge),
          backgroundColor: 'rgba(54, 162, 235, 0.6)',
        },
        {
          label: 'Energy Charges',
          data: costs.monthlyDetails.map(detail => detail.onPeakEnergy + detail.offPeakEnergy),
          backgroundColor: 'rgba(255, 99, 132, 0.6)',
        },
        {
          label: 'Demand Charges',
          data: costs.monthlyDetails.map(detail => detail.demandCharges.total),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
        {
          label: 'Solar Credits',
          data: costs.monthlyDetails.map(detail => -detail.solarCredits),
          backgroundColor: 'rgba(153, 102, 255, 0.6)',
        }
      ]
    };
  }, [costs]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Cost Breakdown',
      },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        ticks: {
          callback: (value) => `$${value}`,
        },
      },
    },
  }), []);

  // Calculate savings percentage
  const savingsPercentage = useMemo(() => {
    if (!costs?.preSolarTotal || !costs?.postSolarTotal) return 0;
    return ((costs.preSolarTotal - costs.postSolarTotal) / costs.preSolarTotal * 100).toFixed(1);
  }, [costs]);

  if (!costs || !chartData) {
    return <div className="error">No cost data available</div>;
  }

  return (
    <div className="results-container">
      <div className="chart-container">
        <Bar data={chartData} options={chartOptions} height={300} />
      </div>

      <div className="monthly-breakdown">
        <h4>Post-Solar Monthly Utility Bills</h4>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Service Charge ($)</th>
                <th>On-Peak Energy ($)</th>
                <th>Off-Peak Energy ($)</th>
                <th>Demand Charges ($)</th>
                <th>Solar Credits ($)</th>
                <th>Total Cost ($)</th>
              </tr>
            </thead>
            <tbody>
              {costs.monthlyDetails.map((detail, index) => (
                <tr key={index}>
                  <td data-label="Month">{detail.month}</td>
                  <td data-label="Service Charge">
                    {detail.serviceCharge.toFixed(2)}
                  </td>
                  <td data-label="On-Peak Energy" className="energy-details">
                    <details>
                      <summary>${(() => {
                        const netOnPeakConsumption = Math.round(detail.solarCalculation.monthlyConsumption * 
                          SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]) - 
                          Math.round(detail.solarCalculation.monthlySolar * 
                          PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]) - 
                          detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH;
                        return netOnPeakConsumption <= 0 ? '0.00' : 
                          (netOnPeakConsumption * detail.energyCalculation?.onPeakRate).toFixed(2);
                      })()}</summary>
                      <div className="energy-calculation">
                        <h5>On-Peak Energy Calculation ({getSeasonFromMonth(detail.month)}):</h5>
                        <ul>
                          <li>Consumption On-Peak: {Math.round(detail.solarCalculation.monthlyConsumption * 
                            SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)])} kWh</li>
                          <li>Production On-Peak: {Math.round(detail.solarCalculation.monthlySolar * 
                            PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)])} kWh</li>
                          <li>Battery Capacity: {detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH} kWh</li>
                          <li>Net Monthly Consumption: {Math.max(0, 
                            Math.round(detail.solarCalculation.monthlyConsumption * 
                              SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]) - 
                            Math.round(detail.solarCalculation.monthlySolar * 
                              PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]) - 
                            (detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH)
                          )} kWh</li>
                          <li>Rate: ${detail.energyCalculation?.onPeakRate?.toFixed(4) || '0.0000'}/kWh</li>
                        </ul>
                        <div className="calculation-formula">
                          <p>Formula: Net Monthly Consumption × Rate</p>
                          <p>
                            {Math.max(0, Math.round(
                              detail.solarCalculation.monthlyConsumption * 
                                SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)] - 
                              detail.solarCalculation.monthlySolar * 
                                PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)] -
                              detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH
                            ))} kWh × ${detail.energyCalculation?.onPeakRate?.toFixed(4) || '0.0000'}/kWh = $
                            {(Math.max(0, Math.round(
                              detail.solarCalculation.monthlyConsumption * 
                                SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)] - 
                              detail.solarCalculation.monthlySolar * 
                                PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)] -
                              detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH
                            )) * detail.energyCalculation?.onPeakRate).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </details>
                  </td>
                  <td data-label="Off-Peak Energy" className="energy-details">
                    <details>
                      <summary>${(() => {
                        const netOffPeakConsumption = Math.round(detail.solarCalculation.monthlyConsumption * 
                          (1 - SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)])) - 
                          Math.round(detail.solarCalculation.monthlySolar * 
                          (1 - PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)])) + 
                          detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH;
                        return netOffPeakConsumption <= 0 ? '0.00' : 
                          (netOffPeakConsumption * detail.energyCalculation?.offPeakRate).toFixed(2);
                      })()}</summary>
                      <div className="energy-calculation">
                        <h5>Off-Peak Energy Calculation ({getSeasonFromMonth(detail.month)}):</h5>
                        <ul>
                          <li>Consumption Off-Peak: {Math.round(detail.solarCalculation.monthlyConsumption * 
                            (1 - SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]))} kWh</li>
                          <li>Production Off-Peak: {Math.round(detail.solarCalculation.monthlySolar * 
                            (1 - PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]))} kWh</li>
                          <li>Battery Capacity: {detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH} kWh</li>
                          <li>Net Monthly Consumption: {Math.round(
                            detail.solarCalculation.monthlyConsumption * 
                              (1 - SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]) - 
                            detail.solarCalculation.monthlySolar * 
                              (1 - PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]) + 
                            detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH
                          )} kWh</li>
                          <li>Rate: ${detail.energyCalculation?.offPeakRate?.toFixed(4) || '0.0000'}/kWh</li>
                        </ul>
                        <div className="calculation-formula">
                          <p>Formula: Net Monthly Consumption × Rate</p>
                          <p>
                            {Math.round(
                              detail.solarCalculation.monthlyConsumption * 
                                (1 - SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]) - 
                              detail.solarCalculation.monthlySolar * 
                                (1 - PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]) + 
                              detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH
                            )} kWh × ${detail.energyCalculation?.offPeakRate?.toFixed(4) || '0.0000'}/kWh = $
                            {(Math.round(
                              detail.solarCalculation.monthlyConsumption * 
                                (1 - SEASONAL_PEAK_USAGE[getSeasonFromMonth(detail.month)]) - 
                              detail.solarCalculation.monthlySolar * 
                                (1 - PEAK_SOLAR_PRODUCTION[getMonthIndex(detail.month)]) + 
                              detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH
                            ) * detail.energyCalculation?.offPeakRate).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </details>
                  </td>
                  <td data-label="Demand Charges" className="demand-details">
                    <details>
                      <summary>Total: ${detail.demandCharges.total.toFixed(2)}</summary>
                      <div className="demand-calculation">
                        <h5>Peak Demand Calculation:</h5>
                        <ol>
                          <li>Annual Consumption: {annualConsumption.toFixed(2)} kWh</li>
                          <li>Season: {detail.demandCharges.calculation.season}</li>
                          <li>Battery Capacity: {detail.demandCharges.calculation.batteryCapacity} kWh</li>
                          <li>Peak Demand from Table: {detail.demandCharges.peakDemand} kW</li>
                        </ol>
                        
                        <h5>Demand Charge Breakdown:</h5>
                        <table className="demand-tiers">
                          <thead>
                            <tr>
                              <th>Tier</th>
                              <th>kW Used</th>
                              <th>Rate</th>
                              <th>Charge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.demandCharges.calculation.tiers.map((tier, i) => (
                              <tr key={i}>
                                <td>{tier.range}</td>
                                <td>{tier.kw.toFixed(2)} kW</td>
                                <td>${tier.rate}/kW</td>
                                <td>${tier.charge.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  </td>
                  <td data-label="Solar Credits" className="solar-details">
  <details>
    <summary>
      -${(() => {
        const SOLAR_CREDIT_RATE = 0.06857;
        const monthConsumption = detail.solarCalculation.monthlyConsumption;
        const monthProduction = detail.solarCalculation.monthlySolar;

        const netAmount = (monthConsumption - monthProduction);
        const netPostSolar = (netAmount - detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH)
        const solarCreds = netPostSolar * SOLAR_CREDIT_RATE;

        return solarCreds.toFixed(2);
      })()}
    </summary>
    <div className="solar-calculation">
      {(() => {
        const SOLAR_CREDIT_RATE = 0.06857;
        const monthConsumption = detail.solarCalculation.monthlyConsumption;
        const monthProduction = detail.solarCalculation.monthlySolar;

        const netAmount = (monthConsumption - monthProduction);
        const netPostSolar = (netAmount - detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH)
        const solarCreds = netPostSolar * SOLAR_CREDIT_RATE;

        return (
          <>
            <h5>Monthly Consumption vs Production:</h5>
            <ul>
              <li>Consumption: {Math.round(monthConsumption)} kWh</li>
              <li>Production: {Math.round(monthProduction)} kWh</li>
              <li>BatteryCapacity: {detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH} kWh</li>
              <li>Net Amount Pre-Battery: {Math.round(netAmount)} kWh</li>
              <li>Net Amount Post-Battery: {Math.round(netAmount-detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH)} kWh</li>
            </ul>

            <h5>Credit Calculation:</h5>
            <div className="credit-breakdown">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>kWh</th>
                    <th>Rate</th>
                    <th>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Net Usage</td>
                    <td>{Math.round(netAmount-detail.demandCharges.calculation.batteryCapacity * DAYS_PER_MONTH)}</td>
                    <td>${SOLAR_CREDIT_RATE.toFixed(5)}</td>
                    <td>-${solarCreds.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
    </div>
  </details>
</td>

                  <td data-label="Total Cost" className="total">
                    ${detail.totalCost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
});

Results.propTypes = {
  costs: PropTypes.shape({
    preSolarTotal: PropTypes.number.isRequired,
    postSolarTotal: PropTypes.number.isRequired,
    monthlyDetails: PropTypes.arrayOf(
      PropTypes.shape({
        month: PropTypes.string.isRequired,
        serviceCharge: PropTypes.number.isRequired,
        onPeakEnergy: PropTypes.number.isRequired,
        offPeakEnergy: PropTypes.number.isRequired,
        demandCharges: PropTypes.shape({
          total: PropTypes.number.isRequired,
          peakDemand: PropTypes.number.isRequired,
          calculation: PropTypes.shape({
            monthlyConsumption: PropTypes.number.isRequired,
            season: PropTypes.string.isRequired,
            peakDemand: PropTypes.number.isRequired,
            tiers: PropTypes.arrayOf(
              PropTypes.shape({
                range: PropTypes.string.isRequired,
                kw: PropTypes.number.isRequired,
                rate: PropTypes.number.isRequired,
                charge: PropTypes.number.isRequired
              })
            ).isRequired
          }).isRequired
        }).isRequired,
        solarCredits: PropTypes.number.isRequired,
        totalCost: PropTypes.number.isRequired,
        solarCalculation: PropTypes.shape({
          monthlyConsumption: PropTypes.number.isRequired,
          monthlySolar: PropTypes.number.isRequired,
          netAmount: PropTypes.number.isRequired,
          excessProduction: PropTypes.number.isRequired,
          onPeak: PropTypes.shape({
            kWh: PropTypes.number.isRequired,
            rate: PropTypes.number.isRequired,
            credit: PropTypes.number.isRequired
          }).isRequired,
          offPeak: PropTypes.shape({
            kWh: PropTypes.number.isRequired,
            rate: PropTypes.number.isRequired,
            credit: PropTypes.number.isRequired
          }).isRequired
        }).isRequired
      })
    ).isRequired
  }).isRequired,
  ampService: PropTypes.number.isRequired,
  annualConsumption: PropTypes.number.isRequired,
  solarGeneration: PropTypes.number.isRequired,
  monthlyPeakAllocation: PropTypes.number.isRequired
};

export default Results;
