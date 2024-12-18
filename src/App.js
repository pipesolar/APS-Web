// src/App.js
import React, { useState, useCallback, useEffect } from 'react';
import Controls from './components/Controls';
import Results from './components/Results';
import { calculateCosts } from './utils/calculations';
import './App.css';
import Footer from './components/Footer';
import Debug from './components/Debug';
import Header from './components/Header';

function App() {
  const [inputs, setInputs] = useState({
    annualConsumption: 20000,
    preSolarOnPeak: 60,
    monthlyPeakAllocation: [
      { month: 'January', onPeak: 60 },
      { month: 'February', onPeak: 60 },
      { month: 'March', onPeak: 60 },
      { month: 'April', onPeak: 60 },
      { month: 'May', onPeak: 60 },
      { month: 'June', onPeak: 60 },
      { month: 'July', onPeak: 60 },
      { month: 'August', onPeak: 60 },
      { month: 'September', onPeak: 60 },
      { month: 'October', onPeak: 60 },
      { month: 'November', onPeak: 60 },
      { month: 'December', onPeak: 60 }
    ],
    batteryCapacity: 10,
    solarGeneration: 15000,
    ampService: 200,
  });

  const [costs, setCosts] = useState(null);
  const [error, setError] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  // Debounced calculation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (costs === null) {
        handleCalculate();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputs]);

  const handleCalculate = useCallback(() => {
    setIsCalculating(true);
    setError(null);

    try {
      const calculatedCosts = calculateCosts(inputs);
      setCosts(calculatedCosts);
    } catch (error) {
      console.error('Calculation error:', error);
      setError(error.message);
      setCosts(null);
    } finally {
      setIsCalculating(false);
    }
  }, [inputs]);

  const handleInputChange = useCallback((name, value) => {
    setInputs(prev => ({
      ...prev,
      [name]: Number(value)
    }));
    setCosts(null); // Reset costs to trigger recalculation
  }, []);

  const handleReset = useCallback(() => {
    setInputs({
      annualConsumption: 15000,
      preSolarOnPeak: 60,
      batteryCapacity: 10,
      solarGeneration: 17000,
      ampService: 200,
    });
    setCosts(null);
    setError(null);
  }, []);
  console.log(costs);
  return (
    <>
      <div className="container">
        <Header />
        <Controls 
          inputs={inputs} 
          onInputChange={handleInputChange}
          onCalculate={handleCalculate}
          isCalculating={isCalculating}
        />
        
        {error && <div className="error">{error}</div>}
        
        {costs && !error && (
          <Results 
            costs={costs} 
            ampService={inputs.ampService}
            annualConsumption={inputs.annualConsumption}
            solarGeneration={inputs.solarGeneration}
            monthlyPeakAllocation={inputs.monthlyPeakAllocation}
          />
        )}

        {costs && (
          <>
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className="debug-button"
            >
              {showDebug ? '🔍 Hide Debug Info' : '🔍 Show Debug Info'}
            </button>
            
            <Debug 
              inputs={inputs} 
              costs={costs} 
              isVisible={showDebug} 
            />
          </>
        )}
      </div>
      <Footer />
    </>
  );
}

export default App;
