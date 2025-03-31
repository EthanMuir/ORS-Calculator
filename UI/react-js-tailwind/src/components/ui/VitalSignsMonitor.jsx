import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx';
import { Button } from './button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';
import { Settings as SettingsIcon, Wifi } from 'lucide-react';
import { ArrowLeftRight } from 'lucide-react';
import { Bell, BellOff, AlertTriangle, AlertCircle } from 'lucide-react';
import Settings from './Settings.jsx';
import { calculateProdigyScore, calculateMewsScore, classifyRisk } from '../../utils/RiskCalculator';
import DecisionBoundaryVisualization from './DecisionBoundaryVisualization.jsx';
import RiskStatus from './RiskStatus.jsx';
import ApiService from '../../utils/ApiService';

// Create a single instance of BluetoothService to share across the app
// Create a single instance of ApiService to share across the app
const sharedApiService = new ApiService('http://localhost:5030');  // Updated to use correct port

// Alert System class
class AlertSystem {
  constructor() {
    this.currentAlertLevel = 0; // 0=none, 1=watch, 2=warning, 3=critical
    this.lastAlertTime = 0;
    this.alertSuppressed = false;
    this.alertHistory = [];
    this.sustainedRiskDuration = {
      level1: 0,
      level2: 0,
      level3: 0
    };
    this.lastEvaluationTime = 0;
  }
  
  // Modify the evaluateAlertState method in AlertSystem class
  evaluateAlertState(currentRisk, vitalSigns, timestamp) {
    // Skip evaluation if in suppression period
    if (this.alertSuppressed) {
      if (timestamp - this.lastAlertTime > 10) { // 10 seconds suppression
        this.alertSuppressed = false;
      } else {
        return this.currentAlertLevel;
      }
    }
    
    // Determine base alert level from risk score
    let newAlertLevel = 0;
    if (currentRisk >= 90) {
      this.sustainedRiskDuration.level3 += 1;
      if (this.sustainedRiskDuration.level3 >= 3) newAlertLevel = 3; // Critical
    } else {
      this.sustainedRiskDuration.level3 = 0;
    }
    
    if (currentRisk >= 75 && currentRisk < 90) {
      this.sustainedRiskDuration.level2 += 1;
      if (this.sustainedRiskDuration.level2 >= 5) newAlertLevel = Math.max(newAlertLevel, 2); // Warning
    } else {
      this.sustainedRiskDuration.level2 = 0;
    }
    
    if (currentRisk >= 60 && currentRisk < 75) {
      this.sustainedRiskDuration.level1 += 1;
      if (this.sustainedRiskDuration.level1 >= 10) newAlertLevel = Math.max(newAlertLevel, 1); // Watch
    } else {
      this.sustainedRiskDuration.level1 = 0;
    }
    
    // Check for severe vital sign abnormalities (override with critical)
    const { hr, br } = vitalSigns;
    if ((br !== undefined && (br <= 4 || br >= 35)) || 
        (hr !== undefined && (hr <= 35 || hr >= 160))) {
      newAlertLevel = 3;
    }
    
    // Check for rapid increase trend (if we have history)
    if (this.alertHistory.length > 15) { // 15 data points = 1.5 seconds in simulation
      const riskShortTimeAgo = this.alertHistory[this.alertHistory.length - 15].risk;
      if (currentRisk - riskShortTimeAgo > 15 && currentRisk >= 65) {
        newAlertLevel = Math.max(newAlertLevel, 2); // Escalate to at least warning
      }
    }
    
    // Store history
    this.alertHistory.push({
      timestamp,
      risk: currentRisk,
      vitalSigns,
      alertLevel: newAlertLevel
    });
    
    // Trim history to last 30 seconds (300 data points)
    if (this.alertHistory.length > 300) {
      this.alertHistory = this.alertHistory.slice(-300);
    }
    
    // STICKY ALERT - only escalate, never automatically decrease
    // Only a manual acknowledgement can clear an alert
    if (newAlertLevel > this.currentAlertLevel) {
      // Escalating alert
      this.currentAlertLevel = newAlertLevel;
      this.lastAlertTime = timestamp;
      this.alertSuppressed = false; // Ensure alert is visible when escalating
    }
    
    return this.currentAlertLevel;
  }
    
    // Reset alert state when explicitly acknowledged
    acknowledgeAlert() {
      this.alertSuppressed = true;
      this.lastAlertTime = Date.now() / 1000; // Convert to seconds
      return this.currentAlertLevel;
    }
    
    // Reset the entire alert system state
    reset() {
      this.currentAlertLevel = 0;
      this.lastAlertTime = 0;
      this.alertSuppressed = false;
      this.alertHistory = [];
      this.sustainedRiskDuration = {
        level1: 0,
        level2: 0,
        level3: 0
      };
      this.lastEvaluationTime = 0;
    }
  }

const VitalSignsMonitor = () => {
  // Track whether monitoring has actually started
  const isInitialRun = useRef(true);  
  // Use the shared API service instead of Bluetooth
  const apiService = sharedApiService;
  
  // Add state to track API connection status
  const [isApiConnected, setIsApiConnected] = useState(apiService.isConnected);
  const [showBoundaryViz, setShowBoundaryViz] = useState(false);

  // Add state for alert system
  const alertSystemRef = useRef(new AlertSystem());
  const [alertLevel, setAlertLevel] = useState(0);
  const [alertAcknowledged, setAlertAcknowledged] = useState(false);
  const [alertSilenceDuration, setAlertSilenceDuration] = useState(0);
  const [alertStartTime, setAlertStartTime] = useState(null);
    
  // Sound reference for alert system
  const alertSoundRef = useRef(null);
  const [alertSound, setAlertSound] = useState(null);

  // Add state for settings view and patient data
  const [showSettings, setShowSettings] = useState(false);
  const [isPatientDetected, setIsPatientDetected] = useState(true);
  const [patientData, setPatientData] = useState({
    age: 50,
    sex: "male",
    sdb: false,
    opioid_naive: false,
    chf: false
  });

  const renderDot = (props) => {
    const { cx, cy, index, dataLength, color } = props;
    
    // Only show dot for the last point
    if (index === dataLength - 1) {
      return (
        <circle 
          cx={cx} 
          cy={cy} 
          r={2.5} 
          fill={color}  
          stroke={color}
          strokeWidth={2} 
        />
      );
    }
    return null;
  };

  // State for storing vital signs data
  const [hrData, setHrData] = useState(() => {
    return Array(100).fill().map((_, i) => ({ value: 0, time: i * 0.1 }));
  });
  const [brData, setBrData] = useState(() => {
    return Array(100).fill().map((_, i) => ({ value: 0, time: i * 0.1 }));
  });
  const [riskScoreData, setRiskScoreData] = useState(() => {
    return Array(100).fill().map((_, i) => ({ value: 0, time: i * 0.1 }));
  });
  const [isRunning, setIsRunning] = useState(false);
  const [status, setStatus] = useState("NORMAL");
  const [currentTime, setCurrentTime] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isApiMonitoring, setIsApiMonitoring] = useState(false);
  const [isProcessingApiData, setIsProcessingApiData] = useState(false);
  const [prodigyScore, setProdigyScore] = useState(0);
  const shouldProcessApiDataRef = useRef(false);
  const [mewsScore, setMewsScore] = useState(0);
  const [riskLevel, setRiskLevel] = useState("Not Assessed");
  
  // Animation frame reference
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  const simulationTimeoutRef = useRef(null);
  const lastUpdateTimeRef = useRef(0); // Track when monitoring started
  
  // Constants for healthy ranges
  const HR_MIN_HEALTHY = 60;
  const HR_MAX_HEALTHY = 100;
  const BR_MIN_HEALTHY = 12;
  const BR_MAX_HEALTHY = 20;

  // Update API connection status periodically
  useEffect(() => {
    const checkConnectionStatus = () => {
      setIsApiConnected(apiService.isConnected);
    };
    
    // Check connection status initially
    checkConnectionStatus();
    
    // Set up interval to check connection status
    const intervalId = setInterval(checkConnectionStatus, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [apiService]);

  // Add this useEffect to initialize the sound
  useEffect(() => {
    // Create audio objects for different alert levels
    const criticalSound = new Audio('/beepboppp.mp3'); // Replace with actual path
    const warningSound = new Audio('/path/to/warning-alert.mp3');   // Replace with actual path
    const watchSound = new Audio('/path/to/watch-alert.mp3');       // Replace with actual path
    
    // Set looping for continuous sound until acknowledged
    criticalSound.loop = true;
    warningSound.loop = true;
    watchSound.loop = true;
    
    // Store them in state
    setAlertSound({
      critical: criticalSound,
      warning: warningSound,
      watch: watchSound
    });
    
    // Cleanup when component unmounts
    return () => {
      if (alertSound) {
        alertSound.critical.pause();
        alertSound.warning.pause();
        alertSound.watch.pause();
      }
    };
  }, []);

  const handleApiData = (data) => {
    if (!shouldProcessApiDataRef.current) return;
    
    // Check if patient is detected - makes sure we properly parse the pd value
    // Use console.log to verify the value is being received correctly
    console.log("Patient detection value:", data.pd);
    
    // Convert to a number explicitly and check if it's negative
    const patientDetected = data.pd !== undefined ? (Number(data.pd) >= 0) : true;
    console.log("Patient detected state:", patientDetected);
    
    // Update state to track patient detection
    setIsPatientDetected(patientDetected);
    
    if (data.heartRate && data.breathRate) {
      // Get current time based on elapsed real time since monitoring started
      const now = Date.now();
      const elapsedSinceStart = now - lastUpdateTimeRef.current;
      const time = elapsedSinceStart / 1000; // Convert to seconds
      
      // Only update graphs if patient is detected
      if (patientDetected) {
        // Add new data points
        setHrData(prevData => {
          const newData = [...prevData, { value: data.heartRate, time }];
          if (newData.length > 100) {
            return newData.slice(-100);
          }
          return newData;
        });
        
        setBrData(prevData => {
          const newData = [...prevData, { value: data.breathRate, time }];
          if (newData.length > 100) {
            return newData.slice(-100);
          }
          return newData;
        });
        
        // Calculate risk scores
        const newProdigyScore = calculateProdigyScore(
          patientData.age,
          patientData.sex,
          patientData.opioid_naive,
          patientData.sdb,
          patientData.chf
        );
        
        const newMewsScore = calculateMewsScore(data.heartRate, data.breathRate);
        const riskResult = classifyRisk(newMewsScore, newProdigyScore);
        setProdigyScore(newProdigyScore);
        setMewsScore(newMewsScore);
        setRiskLevel(riskResult.riskName);
  
        const instantRiskScore = Math.max(
          riskResult.probabilities.moderate * 50,
          riskResult.probabilities.high * 100
        );
        
        // Add to risk data
        setRiskScoreData(prevData => {
          // Create new data point
          const newData = [...prevData, { 
            value: instantRiskScore,
            time,
            averageValue: instantRiskScore // Start with same value, will update in next render
          }];
          
          // Trim to 100 points if needed
          const trimmedData = newData.length > 100 ? newData.slice(-100) : newData;
          
          // Calculate average for the latest point
          const fiveMinutesAgo = Math.max(0, time - 300);
          const recentScores = trimmedData
            .filter(point => point.time >= fiveMinutesAgo && point.time <= time)
            .map(point => point.value);
          
          const avgRiskScore = recentScores.length > 0 
            ? recentScores.reduce((sum, val) => sum + val, 0) / recentScores.length
            : instantRiskScore;
          
          // Update the average on the last point
          if (trimmedData.length > 0) {
            trimmedData[trimmedData.length - 1].averageValue = avgRiskScore;
          }
          
          return trimmedData;
        });
  
        // Update status based on vital signs
        if (data.heartRate < HR_MIN_HEALTHY || data.heartRate > HR_MAX_HEALTHY || 
            data.breathRate < BR_MIN_HEALTHY || data.breathRate > BR_MAX_HEALTHY) {
          setStatus("AT RISK");
        } else {
          setStatus("NORMAL");
        }
      } else {
        // If no patient is detected, set a specific status
        setStatus("NOT DETECTED");
      }
      
      setCurrentTime(time);
    }
  };
  
  // Set up API callback when component mounts
  useEffect(() => {
    apiService.setDataReceivedCallback(handleApiData);
    
    return () => {
      // Cleanup on unmount
      apiService.disconnect();
    };
  }, []);
  
  // Reset function - called whenever we start a new monitoring or simulation
  const resetMonitor = () => {
    // Clear the data arrays completely
    setHrData([]);
    setBrData([]);
    setRiskScoreData([]);

    setIsPatientDetected(true);
    alertSystemRef.current.reset();
    setAlertLevel(0);
    setAlertAcknowledged(false);
    setAlertStartTime(null);

    // Reset time and status
    timeRef.current = 0;
    setCurrentTime(0);
    setStatus("NORMAL");
    isInitialRun.current = true;
    
    // Clear any ongoing animations or timeouts
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
  };

  // Function to generate random vital signs
  const generateRandomVitals = (time) => {
    // Normal values with some variation
    const hr = 70 + Math.sin(time * 0.2) * 10 + Math.random() * 5;
    const br = 16 + Math.sin(time * 0.1) * 3 + Math.random() * 2;
    return { hr, br, time };
  };
  
  // Simulation data generators
  const generateHealthySimulation = () => {
    return Array(300).fill().map((_, i) => {
      const time = i / 10;
      const hr = 70 + Math.sin(time * 0.2) * 10 + Math.random() * 5;
      const br = 16 + Math.sin(time * 0.1) * 3 + Math.random() * 2;
      return { hr, br, time };
    });
  };
  
  const generateUnhealthySimulation = () => {
    return Array(300).fill().map((_, i) => {
      const time = i / 10;
      const decline = Math.min(1, time / 30) * 50;
      const hr = Math.max(30, 70 + Math.sin(time * 0.2) * 10 - decline + Math.random() * 5);
      const br = Math.max(6, 16 + Math.sin(time * 0.1) * 3 - decline/3 + Math.random() * 2);
      return { hr, br, time };
    });
  };

  // Heart attack simulation
// More severe heart attack simulation
const generateHeartAttackSimulation = () => {
  return Array(300).fill().map((_, i) => {
    const time = i / 10;
    let hr, br;
    
    // Phase 1: Initial symptoms (0-8s) - increasing heart rate
    if (time < 8) {
      hr = 70 + (time * 7) + Math.random() * 5; // Rapidly increase to ~125
      br = 16 + (time * 1.5) + Math.random() * 2; // Rapidly increase to ~28
    } 
    // Phase 2: Acute phase (8-15s) - extremely rapid HR, high BR
    else if (time < 15) {
      hr = 125 + Math.sin(time * 0.8) * 20 + Math.random() * 15; // Fluctuating up to 160 
      br = 28 + Math.sin(time * 0.4) * 5 + Math.random() * 3; // Very high breathing rate ~35
    } 
    // Phase 3: Critical phase (15-30s) - severe irregularity and dramatic drops
    else {
      // Create more extreme irregular heartbeat pattern with sudden dramatic drops
      const irregularity = Math.sin(time * 3) * 30 + Math.cos(time * 8) * 25;
      
      if ((time > 20 && time < 22) || (time > 25 && time < 27)) {
        // Simulate dangerous arrhythmia episodes with very low heart rate
        hr = Math.max(30, 40 + irregularity/3 + Math.random() * 10);
      } else {
        const decline = Math.min(70, (time - 15) * 3.5);
        hr = Math.max(35, 135 - decline + irregularity + Math.random() * 5);
      }
      
      // Breathing becomes increasingly labored and irregular
      br = Math.max(8, 30 - ((time - 15) * 0.8) + Math.sin(time * 0.5) * 12 + Math.random() * 5);
    }
    
    return { hr, br, time };
  });
};

  // Respiratory depression simulation
// Modified respiratory depression simulation with more severe values
const generateRespiratoryDepressionSimulation = () => {
  return Array(300).fill().map((_, i) => {
    const time = i / 10;
    let hr, br;
    
    // Phase 1: Initial symptoms (0-8s) - mild depression
    if (time < 8) {
      hr = 70 + Math.sin(time * 0.2) * 5 + Math.random() * 3; // Normal HR
      br = Math.max(8, 16 - (time * 0.3) + Math.sin(time * 0.1) * 2 + Math.random() * 1); // Gradually decreasing
    } 
    // Phase 2: Moderate depression (8-15s)
    else if (time < 15) {
      hr = Math.max(50, 70 - ((time - 8) * 1.5) + Math.sin(time * 0.2) * 5 + Math.random() * 3); // HR starts to slow more rapidly
      br = Math.max(5, 13 - ((time - 8) * 0.6) + Math.sin(time * 0.1) * 1 + Math.random() * 1); // Further decreasing
    } 
    // Phase 3: Severe depression (15-30s) - extended critical phase
    else {
      hr = Math.max(35, 55 - ((time - 15) * 0.6) + Math.sin(time * 0.2) * 3 + Math.random() * 2); // Very slow HR
      br = Math.max(2, 7 - ((time - 15) * 0.3) + Math.sin(time * 0.1) * 0.5 + Math.random() * 0.5); // Critically low BR for longer
    }
    
    return { hr, br, time };
  });
};

  // Sleep apnea simulation
  const generateSleepApneaSimulation = () => {
    return Array(300).fill().map((_, i) => {
      const time = i / 10;
      let hr, br;
      
      // Create a cyclic pattern to simulate apnea episodes
      const cyclePosition = (time % 10) / 10; // Repeating 10-second cycles
      
      // Normal breathing phase (first 60% of cycle)
      if (cyclePosition < 0.6) {
        hr = 70 + Math.sin(time * 0.2) * 5 + Math.random() * 3;
        br = 14 + Math.sin(time * 0.3) * 2 + Math.random() * 2;
      }
      // Apnea episode (next 30% of cycle)
      else if (cyclePosition < 0.9) {
        // During apnea, breathing rate drops to near zero
        br = Math.max(0, 2 + Math.random() * 2); 
        
        // Heart rate initially stays normal, then drops, then spikes at end of episode
        const apneaProgress = (cyclePosition - 0.6) / 0.3; // 0 to 1 through the apnea
        
        if (apneaProgress < 0.5) {
          // First half of apnea: HR gradually decreases
          hr = 70 - (apneaProgress * 15) + Math.random() * 3;
        } else {
          // Second half of apnea: HR begins to rise back up
          hr = 55 + ((apneaProgress - 0.5) * 30) + Math.random() * 3;
        }
      }
      // Recovery from episode (last 10% of cycle)
      else {
        // Quick arousal - breathing resumes, heart rate spikes briefly
        br = 16 + Math.random() * 4;
        hr = 85 - ((cyclePosition - 0.9) * 150) + Math.random() * 5; // Starts high, returns to baseline
      }
      
      return { hr, br, time };
    });
  };
  
  // Add this function to toggle between visualizations
  const toggleVisualization = () => {
    setShowBoundaryViz(!showBoundaryViz);
  };

  
  // Function to update data in real-time
  const updateData = () => {
    const now = Date.now();
    const elapsedSinceStart = now - lastUpdateTimeRef.current;
    
    // Calculate time in seconds (accurate to real-world time)
    const realTimeSeconds = elapsedSinceStart / 1000;
    
    // Use the real-time value for x-axis
    const time = realTimeSeconds;
    
    // Generate new vital signs data
    const { hr, br } = generateRandomVitals(time);
    
    // In simulation mode, we'll always consider a patient is detected
    setIsPatientDetected(true);
    
    if (isInitialRun.current) {
      // First data point - initialize with empty arrays
      setHrData([{ value: hr, time }]);
      setBrData([{ value: br, time }]);
      isInitialRun.current = false;
    } else {
      // Add new data points
      setHrData(prevData => [...prevData, { value: hr, time }]);
      setBrData(prevData => [...prevData, { value: br, time }]);
    }

    const newProdigyScore = calculateProdigyScore(
      patientData.age,
      patientData.sex,
      patientData.opioid_naive,
      patientData.sdb,
      patientData.chf
    );
    
    const newMewsScore = calculateMewsScore(hr, br);
    const riskResult = classifyRisk(newMewsScore, newProdigyScore);
    setProdigyScore(newProdigyScore);
    setMewsScore(newMewsScore);
    setRiskLevel(riskResult.riskName);

    const instantRiskScore = Math.max(
      riskResult.probabilities.moderate * 50,
      riskResult.probabilities.high * 100
    );
    
    // Add to risk data
    setRiskScoreData(prevData => {
      // Create new data point
      const newData = [...prevData, { 
        value: instantRiskScore,
        time,
        averageValue: instantRiskScore // Start with same value, will update in next render
      }];
      
      // Trim to 100 points if needed
      const trimmedData = newData.length > 100 ? newData.slice(-100) : newData;
      
      // Calculate average for the latest point
      const fiveMinutesAgo = Math.max(0, time - 300);
      const recentScores = trimmedData
        .filter(point => point.time >= fiveMinutesAgo && point.time <= time)
        .map(point => point.value);
      
      const avgRiskScore = recentScores.length > 0 
        ? recentScores.reduce((sum, val) => sum + val, 0) / recentScores.length
        : instantRiskScore;

      // Evaluate alert state
      const currentAlertLevel = alertSystemRef.current.evaluateAlertState(
        avgRiskScore,
        { hr, br },
        time
      );
      setAlertLevel(currentAlertLevel);
      
      // Update the average on the last point
      if (trimmedData.length > 0) {
        trimmedData[trimmedData.length - 1].averageValue = avgRiskScore;
      }
      
      return trimmedData;
    });

    // Update status based on vital signs
    if (hr < HR_MIN_HEALTHY || hr > HR_MAX_HEALTHY || 
        br < BR_MIN_HEALTHY || br > BR_MAX_HEALTHY) {
      setStatus("AT RISK");
    } else {
      setStatus("NORMAL");
    }
    
    setCurrentTime(time);
    
    // Schedule the next update if still running
    if (isRunning) {
      // Use the same delay as in simulation (100ms)
      simulationTimeoutRef.current = setTimeout(updateData, 100);
    }
  };

  // Helper function to run a simulation sequence with given data
  const runSimulationSequence = (simulation) => {
    let index = 0;
    let accumulatedData = { hr: [], br: [], risk: [] };
    
    const runSimulation = () => {
      if (index < simulation.length) {
        const { hr, br, time } = simulation[index];
        
        // Add to accumulated data
        accumulatedData.hr.push({ value: hr, time });
        accumulatedData.br.push({ value: br, time });
      
        // Update state with all accumulated data
        setHrData([...accumulatedData.hr]);
        setBrData([...accumulatedData.br]);

        // Calculate risk scores
        const newProdigyScore = calculateProdigyScore(
          patientData.age,
          patientData.sex,
          patientData.opioid_naive,
          patientData.sdb,
          patientData.chf
        );

        const newMewsScore = calculateMewsScore(hr, br);
        const riskResult = classifyRisk(newMewsScore, newProdigyScore);
        setProdigyScore(newProdigyScore);
        setMewsScore(newMewsScore);
        setRiskLevel(riskResult.riskName);

        const instantRiskScore = Math.max(
          riskResult.probabilities.moderate * 50,
          riskResult.probabilities.high * 100
        );
        
        // Add to risk data
        setRiskScoreData(prevData => {
          // Create new data point
          const newData = [...prevData, { 
            value: instantRiskScore,
            time,
            averageValue: instantRiskScore // Start with same value, will update in next render
          }];
          
          // Trim to 100 points if needed
          const trimmedData = newData.length > 100 ? newData.slice(-100) : newData;
          
          // Calculate average for the latest point
          const fiveMinutesAgo = Math.max(0, time - 300);
          const recentScores = trimmedData
            .filter(point => point.time >= fiveMinutesAgo && point.time <= time)
            .map(point => point.value);
          
          const avgRiskScore = recentScores.length > 0 
            ? recentScores.reduce((sum, val) => sum + val, 0) / recentScores.length
            : instantRiskScore;

          // Evaluate alert state
          const currentAlertLevel = alertSystemRef.current.evaluateAlertState(
            avgRiskScore,
            { hr, br },
            time
          );
          setAlertLevel(currentAlertLevel);
          
          // Update the average on the last point
          if (trimmedData.length > 0) {
            trimmedData[trimmedData.length - 1].averageValue = avgRiskScore;
          }
          
          return trimmedData;
        });

        // Update status
        if (hr < HR_MIN_HEALTHY || hr > HR_MAX_HEALTHY || 
            br < BR_MIN_HEALTHY || br > BR_MAX_HEALTHY) {
          setStatus("AT RISK");
        } else {
          setStatus("NORMAL");
        }
        
        setCurrentTime(time);
        index++;
        simulationTimeoutRef.current = setTimeout(runSimulation, 100);
      } else {
        setIsSimulating(false);
      }
    };
    
    // Start simulation
    runSimulation();
  };
  // Modify the alert level effect to play sounds
  useEffect(() => {
    // Reset alert start time when level changes from 0
    if (alertLevel > 0 && !alertStartTime) {
      setAlertStartTime(Date.now());
    } else if (alertLevel === 0) {
      setAlertStartTime(null);
    }
    
    // Play appropriate sound based on alert level
    if (alertSound) {
      // Stop all sounds first
      alertSound.critical.pause();
      alertSound.warning.pause();
      alertSound.watch.pause();
      
      // Play the appropriate sound if not acknowledged
      if (!alertAcknowledged) {
        if (alertLevel === 3) alertSound.critical.play();
        else if (alertLevel === 2) alertSound.warning.play();
        else if (alertLevel === 1) alertSound.watch.play();
      }
    }
  }, [alertLevel, alertAcknowledged, alertSound]);

  // Effect to handle animation starting/stopping
  useEffect(() => {
    if (isRunning) {
      // Only start the random data generation if API is NOT connected
      if (!isApiConnected) {
        simulationTimeoutRef.current = setTimeout(updateData, 100);
      }
    } else if (simulationTimeoutRef.current) {
      // Clear timeout when stopping
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    
    return () => {
      // Cleanup function
      if (simulationTimeoutRef.current) {
        clearTimeout(simulationTimeoutRef.current);
        simulationTimeoutRef.current = null;
      }
    };
  }, [isRunning, isApiConnected]); // Added isApiConnected as a dependency
  
  // Start monitoring
  const startMonitoring = () => {
    resetMonitor();
    setIsPatientDetected(true);
    lastUpdateTimeRef.current = Date.now(); // Set the start time
    setIsRunning(true); // Always set isRunning to true when monitoring starts
    shouldProcessApiDataRef.current = true; // Start processing API data
    if (isApiConnected) {
      setIsApiMonitoring(true);
    }
  };
  
  // Stop monitoring
  const stopMonitoring = () => {
    setIsRunning(false);
    setIsApiMonitoring(false);
    shouldProcessApiDataRef.current = false; // Stop processing API data
  };

  // Stop simulation
  const stopSimulation = () => {
    if (simulationTimeoutRef.current) {
      clearTimeout(simulationTimeoutRef.current);
      simulationTimeoutRef.current = null;
    }
    setIsSimulating(false);
  };
  
  // Run healthy simulation
  const runHealthySimulation = () => {
    setIsPatientDetected(true);
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateHealthySimulation();
    runSimulationSequence(simulation);
  };
  
  // Run unhealthy simulation
  const runUnhealthySimulation = () => {
    setIsPatientDetected(true);
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateUnhealthySimulation();
    runSimulationSequence(simulation);
  };

  // Run heart attack simulation
  const runHeartAttackSimulation = () => {
    setIsPatientDetected(true);
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateHeartAttackSimulation();
    runSimulationSequence(simulation);
  };

  // Run respiratory depression simulation
  const runRespiratoryDepressionSimulation = () => {
    setIsPatientDetected(true);
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateRespiratoryDepressionSimulation();
    runSimulationSequence(simulation);
  };

  // Run sleep apnea simulation
  const runSleepApneaSimulation = () => {
    setIsPatientDetected(true);
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateSleepApneaSimulation();
    runSimulationSequence(simulation);
  };
  
  // Determine status color
  const statusColor = status === "AT RISK" ? "text-red-500" : "text-green-500";
  
  // Get current HR and BR values
  const currentHR = hrData[hrData.length-1]?.value.toFixed(1) || 0;
  const currentBR = brData[brData.length-1]?.value.toFixed(1) || 0;

  // Calculate risk score and update state
  const calculateAndUpdateRiskScore = (hr, br, time) => {
    // Calculate risk scores
    const newProdigyScore = calculateProdigyScore(
      patientData.age,
      patientData.sex,
      patientData.opioid_naive,
      patientData.sdb,
      patientData.chf
    );
    
    const newMewsScore = calculateMewsScore(hr, br);
    const riskResult = classifyRisk(newMewsScore, newProdigyScore);
    
    // Update state with new scores
    setProdigyScore(newProdigyScore);
    setMewsScore(newMewsScore);
    setRiskLevel(riskResult.riskName);

    // Calculate instant risk score (0-100 scale)
    const instantRiskScore = Math.max(
      riskResult.probabilities.moderate * 50,
      riskResult.probabilities.high * 100
    );
    
    // Update risk score data
    setRiskScoreData(prevData => {
      // Create new data point with both instant value and time
      const newDataPoint = { 
        value: instantRiskScore,
        time 
      };
      
      // Add to array
      const newData = [...prevData, newDataPoint];
      
      // Limit to 100 points and calculate average
      if (newData.length > 100) {
        return newData.slice(-100).map((point, idx, arr) => {
          if (idx === arr.length - 1) {
            // Only calculate average for the latest point to avoid excessive re-renders
            return {
              ...point,
              averageValue: calculateAverageRiskScore(time, newData)
            };
          }
          return point;
        });
      }
      
      // Calculate average for the new point
      return newData.map((point, idx, arr) => {
        if (idx === arr.length - 1) {
          return {
            ...point,
            averageValue: calculateAverageRiskScore(time, newData)
          };
        }
        return point;
      });
    });
  };

  // Improved average calculation with the data array passed as parameter
  const calculateAverageRiskScore = (currentTime, dataArray) => {
    // Ensure currentTime is a number
    const timeVal = Number(currentTime) || 0;
    
    // Get data from last 5 minutes (300 seconds)
    const fiveMinutesAgo = Math.max(0, timeVal - 300);
    
    // Use the provided data array or fall back to the state
    const data = dataArray || riskScoreData;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return 0;
    }
    
    // Filter data points from the last 5 minutes
    const recentScores = data
      .filter(point => {
        if (!point) return false;
        return typeof point.time === 'number' && 
              point.time >= fiveMinutesAgo && 
              point.time <= timeVal;
      })
      .map(point => Number(point.value) || 0);
    
    // If no valid points in time range, return the most recent value if available
    if (recentScores.length === 0) {
      const mostRecent = data[data.length - 1];
      return mostRecent && typeof mostRecent.value === 'number' ? mostRecent.value : 0;
    }
    
    // Calculate and return average
    return calculateAverage(recentScores);
  };

  // Helper function to calculate average of array values
  const calculateAverage = (values) => {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  };

  // Calculate time since alert started
  const getAlertDuration = () => {
    if (!alertStartTime) return 0;
    return Math.floor((Date.now() - alertStartTime) / 1000);
  };

  // Function to acknowledge the current alert
  const acknowledgeAlert = () => {
    // Use the AlertSystem's acknowledge function
    alertSystemRef.current.acknowledgeAlert();
    setAlertAcknowledged(true);
    
    // Stop all sounds
    if (alertSound) {
      alertSound.critical.pause();
      alertSound.warning.pause();
      alertSound.watch.pause();
    }
    
    // This will keep the alert suppressed for 10 seconds (as defined in AlertSystem)
    // After which, if conditions are still alert-worthy, it will reappear
  };

  // Function to get alert class for styling based on alert level
  const getAlertClass = () => {
    switch (alertLevel) {
      case 1:
        return "bg-yellow-100 border-yellow-400 text-yellow-800"; // Watch
      case 2:
        return "bg-orange-100 border-orange-400 text-orange-800"; // Warning
      case 3:
        return "bg-red-100 border-red-400 text-red-800"; // Critical
      default:
        return "hidden"; // No alert
    }
  };
    
  // Function to get alert icon based on alert level
  const getAlertIcon = () => {
    switch (alertLevel) {
      case 1:
        return <AlertCircle className="h-5 w-5 text-yellow-500 mr-2" />; // Watch
      case 2:
        return <AlertTriangle className="h-5 w-5 text-orange-500 mr-2" />; // Warning
      case 3:
        return <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />; // Critical
      default:
        return null; // No alert
    }
  };
    
  // Function to get alert text based on alert level
  const getAlertText = () => {
    switch (alertLevel) {
      case 1:
        return "Watch - Patient may be at risk"; 
      case 2:
        return "Warning - Patient requires attention";
      case 3:
        return "CRITICAL - Immediate intervention needed";
      default:
        return "";
    }
  };
  
  // If showing settings, render the Settings component
  if (showSettings) {
    return (
      <Settings 
        onBack={() => setShowSettings(false)} 
        patientData={patientData} 
        setPatientData={setPatientData} 
        apiService={apiService}  // Pass apiService instead of bluetoothService
      />
    );
  }
  
  // Otherwise, render the main monitor view
  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <Button 
          variant="ghost" 
          className="p-2" 
          onClick={() => setShowSettings(true)}
        >
          <SettingsIcon className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-2xl font-bold text-center text-gray-800">Vital Signs Monitor</h1>
        <div className="w-8"></div> {/* Empty div for spacing */}
      </div>
      {/* Alert Banner - shows only when alert level > 0 */}
      {alertLevel > 0 && (
        <div className={`mb-4 p-3 border rounded-md flex items-center justify-between transition-opacity duration-300 ${
          alertLevel > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${getAlertClass()}`}>
          <div className="flex items-center">
            {getAlertIcon()}
            <div>
              <div className="font-bold">{getAlertText()}</div>
              <div className="text-sm">
                Alert active for: {getAlertDuration()} seconds
              </div>
            </div>
          </div>
          <Button 
            className={`px-2 py-1 ${alertAcknowledged ? 'bg-gray-300' : 'bg-white'}`}
            onClick={acknowledgeAlert}
            disabled={alertAcknowledged}
          >
            {alertAcknowledged ? (
              <BellOff className="h-4 w-4 text-gray-500" />
            ) : (
              <Bell className="h-4 w-4 text-gray-700" />
            )}
            <span className="ml-1 text-xs">
              {alertAcknowledged ? 'Silenced' : 'Acknowledge'}
            </span>
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
        {/* Left column - Controls and Status */}
        <div className="flex flex-col gap-4">
        {/* Controls Card */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="run" className="w-full">
              <TabsList className="grid grid-cols-2 border-b border-gray-200 p-0 mb-4">
                <TabsTrigger 
                  value="run" 
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-all border-b-2 border-transparent hover:text-foreground hover:border-gray-300 data-[state=active]:border-blue-500 data-[state=active]:text-foreground data-[state=active]:font-semibold"
                >
                  Run
                </TabsTrigger>
                <TabsTrigger 
                  value="sim"
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-all border-b-2 border-transparent hover:text-foreground hover:border-gray-300 data-[state=active]:border-blue-500 data-[state=active]:text-foreground data-[state=active]:font-semibold"
                >
                  Sim
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="run" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2.5"
                    onClick={startMonitoring}
                    disabled={isRunning}
                  >
                    Start
                  </Button>
                  <Button 
                    className="border border-red-300 text-red-500 bg-white hover:bg-red-50 py-2.5"
                    onClick={stopMonitoring}
                    disabled={!isRunning && !isApiMonitoring}
                  >
                    Stop
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="sim" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="bg-green-500 hover:bg-green-600 text-white py-2.5"
                    onClick={runHealthySimulation}
                  >
                    Healthy Patient
                  </Button>
                  <Button 
                    className="bg-amber-500 hover:bg-amber-600 text-white py-2.5"
                    onClick={runUnhealthySimulation}
                  >
                    Declining Patient
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    className="bg-red-500 hover:bg-red-600 text-white py-2.5"
                    onClick={runHeartAttackSimulation}
                  >
                    Heart Attack
                  </Button>
                  <Button 
                    className="bg-indigo-500 hover:bg-indigo-600 text-white py-2.5"
                    onClick={runRespiratoryDepressionSimulation}
                  >
                    Respiratory Depression
                  </Button>
                </div>
                
                {/* <Button 
                  className="bg-purple-500 hover:bg-purple-600 text-white w-full py-2.5"
                  onClick={runSleepApneaSimulation}
                >
                  Sleep Apnea
                </Button> */}
                
                <Button 
                  className={`border border-red-300 text-red-500 bg-white hover:bg-red-50 w-full py-2.5 ${isSimulating ? '' : 'opacity-50'}`}
                  onClick={stopSimulation}
                >
                  Stop Simulation
                </Button>
              </TabsContent>
            </Tabs>
            
            {isApiConnected && (
              <div className="flex items-center mt-4 text-green-500 text-sm border-t border-gray-100 pt-4">
                <Wifi className="h-4 w-4 mr-2" />
                <span>Sensor Connected</span>
              </div>
            )}
            {isApiConnected && (
              <div className={`flex items-center mt-2 text-sm ${isPatientDetected ? 'text-green-500' : 'text-red-500'}`}>
                <span className="h-3 w-3 rounded-full mr-2 bg-current"></span>
                <span>{isPatientDetected ? 'Patient Detected' : 'No Patient Detected'}</span>
              </div>
            )}
          </CardContent>
        </Card>
          
          {/* Risk Status Card */}
          <RiskStatus 
            riskLevel={riskLevel} 
            prodigyScore={prodigyScore} 
            mewsScore={mewsScore} 
            avgRisk={riskScoreData.length > 0 ? riskScoreData[riskScoreData.length-1].averageValue / 100 : 0}
            currentAlertLevel={alertLevel} // Add this prop if you want to ensure exact match with banner
          />

          {/* Vital Signs Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Current Vitals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex justify-between mb-2">
                  <span>Heart Rate:</span>
                  {isPatientDetected ? (
                    <span className="font-medium">{currentHR} bpm</span>
                  ) : (
                    <span className="font-medium text-red-500">No patient detected</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span>Breathing Rate:</span>
                  {isPatientDetected ? (
                    <span className="font-medium">{currentBR} brpm</span>
                  ) : (
                    <span className="font-medium text-red-500">No patient detected</span>
                  )}
                </div>
                {isApiConnected && (
                  <div className="flex items-center justify-end mt-2 text-green-500 text-xs">
                    <Wifi className="h-3 w-3 mr-1" />
                    <span>Live data</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          {/* Patient Info Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Patient Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Age:</span>
                  <span className="font-medium">{patientData.age}</span>
                </div>
                <div className="flex justify-between">
                  <span>Sex:</span>
                  <span className="font-medium capitalize">{patientData.sex}</span>
                </div>
                <div className="flex justify-between">
                  <span>SDB:</span>
                  <span className="font-medium">{patientData.sdb ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opioid Naive:</span>
                  <span className="font-medium">{patientData.opioid_naive ? "Yes" : "No"}</span>
                </div>
                <div className="flex justify-between">
                  <span>CHF:</span>
                  <span className="font-medium">{patientData.chf ? "Yes" : "No"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Combined Graphs */}
        <Card className="shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Vital Signs Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Heart Rate Graph */}
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrData} margin={{ top: 5, right: 20, bottom: 25, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    domain={['dataMin', Math.max(10, hrData.length > 0 ? hrData[hrData.length-1].time : 10)]}
                    type="number"
                    tickFormatter={(tick) => Math.max(0, tick).toFixed(0)}
                  >
                    <Label value="Time (s)" position="bottom" offset={10} />
                  </XAxis>
                  <YAxis 
                    domain={[30, 140]} 
                    ticks={[30, 50, 70, 90, 110, 130]}
                  >
                    <Label 
                      value="Heart Rate (bpm)" 
                      angle={-90} 
                      position="insideLeft" 
                      style={{ textAnchor: 'middle' }}
                      offset={-10}
                    />
                  </YAxis>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#007AFF" 
                    strokeWidth={2}
                    dot={(props) => renderDot({...props, dataLength: hrData.length, color: "#007AFF"})}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Breathing Rate Graph */}
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={brData} margin={{ top: 5, right: 20, bottom: 25, left: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    domain={['dataMin', Math.max(10, brData.length > 0 ? brData[brData.length-1].time : 10)]}
                    type="number"
                    tickFormatter={(tick) => Math.max(0, tick).toFixed(0)}
                  >
                    <Label value="Time (s)" position="bottom" offset={10} />
                  </XAxis>
                  <YAxis 
                    domain={[5, 25]} 
                    ticks={[5, 10, 15, 20, 25]}
                  >
                    <Label 
                      value="Breathing Rate (brpm)" 
                      angle={-90} 
                      position="insideLeft" 
                      style={{ textAnchor: 'middle' }}
                      offset={-10}
                    />
                  </YAxis>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#5AC8FA" 
                    strokeWidth={2}
                    dot={(props) => renderDot({...props, dataLength: brData.length, color: "#5AC8FA"})}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {/* Risk Score Graph or Decision Boundary Visualization */}
            <div className="h-60 relative">
              {/* Toggle button */}
              <Button 
                className="absolute top-0 right-0 z-10 p-1 m-2 bg-gray-700 hover:bg-gray-800 rounded-full"
                onClick={toggleVisualization}
                title={showBoundaryViz ? "Show Risk Score Graph" : "Show Decision Boundary"}
              >
                <ArrowLeftRight className="h-4 w-4 text-white" />
              </Button>
              
              {showBoundaryViz ? (
                // Decision Boundary Visualization
                <div className="w-full h-full">
                  <DecisionBoundaryVisualization 
                    mewsScore={mewsScore} 
                    prodigyScore={prodigyScore} 
                  />
                </div>
              ) : (
                // Risk Score Graph (original content)
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={riskScoreData} margin={{ top: 5, right: 20, bottom: 25, left: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="time" 
                      domain={['dataMin', Math.max(10, riskScoreData.length > 0 ? riskScoreData[riskScoreData.length-1].time : 10)]}
                      type="number"
                      tickFormatter={(tick) => Math.max(0, tick).toFixed(0)}
                    >
                      <Label value="Time (s)" position="bottom" offset={10} />
                    </XAxis>
                    <YAxis 
                      domain={[0, 100]} 
                      ticks={[0, 25, 50, 75, 100]}
                    >
                      <Label 
                        value="Risk Score (%)" 
                        angle={-90} 
                        position="insideLeft" 
                        style={{ textAnchor: 'middle' }}
                        offset={-10}
                      />
                    </YAxis>
                    {/* <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#FF9500" 
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                      name="Instant Risk"
                    /> */}
                    <Line 
                      type="monotone" 
                      dataKey="averageValue" 
                      stroke="#FF3B30" 
                      strokeWidth={2}
                      dot={(props) => renderDot({...props, dataLength: riskScoreData.length, color: "#FF3B30"})}
                      isAnimationActive={false}
                      name="5-min average Risk"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
           </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VitalSignsMonitor;