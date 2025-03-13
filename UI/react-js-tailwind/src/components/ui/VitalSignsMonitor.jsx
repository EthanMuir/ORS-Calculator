import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx';
import { Button } from './button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';
import { Settings as SettingsIcon, Wifi } from 'lucide-react';
import Settings from './Settings.jsx';
import { calculateProdigyScore, calculateMewsScore, classifyRisk } from '../../utils/RiskCalculator';
import RiskStatus from './RiskStatus.jsx';
import ApiService from '../../utils/ApiService';

// Create a single instance of BluetoothService to share across the app
// Create a single instance of ApiService to share across the app
const sharedApiService = new ApiService('http://localhost:5030');  // Updated to use correct port

const VitalSignsMonitor = () => {
  // Track whether monitoring has actually started
  const isInitialRun = useRef(true);  
  // Use the shared API service instead of Bluetooth
  const apiService = sharedApiService;
  
  // Add state to track API connection status
  const [isApiConnected, setIsApiConnected] = useState(apiService.isConnected);

  // Add state for settings view and patient data
  const [showSettings, setShowSettings] = useState(false);
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

  const handleApiData = (data) => {
    if (!shouldProcessApiDataRef.current) return;
    if (data.heartRate && data.breathRate) {
      // Get current time based on elapsed real time since monitoring started
      const now = Date.now();
      const elapsedSinceStart = now - lastUpdateTimeRef.current;
      const time = elapsedSinceStart / 1000; // Convert to seconds
      
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
      
      // Update status based on vital signs
      if (data.heartRate < HR_MIN_HEALTHY || data.heartRate > HR_MAX_HEALTHY || 
          data.breathRate < BR_MIN_HEALTHY || data.breathRate > BR_MAX_HEALTHY) {
        setStatus("AT RISK");
      } else {
        setStatus("NORMAL");
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
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateHealthySimulation();
    let index = 0;
    let accumulatedData = { hr: [], br: [] };
    
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
      }else {
        setIsSimulating(false);
      }
    };
    
    // Reset time reference and start simulation
    runSimulation();
  };
  
  // Run unhealthy simulation
  const runUnhealthySimulation = () => {
    resetMonitor();
    stopMonitoring();
    setIsSimulating(true);
    const simulation = generateUnhealthySimulation();
    let index = 0;
    let accumulatedData = { hr: [], br: [] };
    
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
      }else {
        setIsSimulating(false);
      }
    };
    
    // Reset time reference and start simulation
    runSimulation();
  };
  
  // Determine status color
  const statusColor = status === "AT RISK" ? "text-red-500" : "text-green-500";
  
  // Get current HR and BR values
  const currentHR = hrData[hrData.length-1]?.value.toFixed(1) || 0;
  const currentBR = brData[brData.length-1]?.value.toFixed(1) || 0;
  
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
                <TabsList className="grid grid-cols-2 mb-4">
                  <TabsTrigger value="run">Run</TabsTrigger>
                  <TabsTrigger value="sim">Sim</TabsTrigger>
                </TabsList>
                
                <TabsContent value="run" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="default" 
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      onClick={startMonitoring}
                      disabled={isRunning}
                    >
                      Start
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-red-500 text-red-500 hover:bg-red-50"
                      onClick={stopMonitoring}
                      disabled={!isRunning && !isApiMonitoring}
                    >
                      Stop
                    </Button>
                  </div>
                </TabsContent>
                
                <TabsContent value="sim" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="default" 
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={runHealthySimulation}
                    >
                      Healthy Patient
                    </Button>
                    <Button 
                      variant="default"
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                      onClick={runUnhealthySimulation}
                    >
                      Declining Patient
                    </Button>
                  </div>
                  <Button 
                    variant="outline" 
                    className={`border-red-500 text-red-500 hover:bg-red-50 w-full ${isSimulating ? '' : 'opacity-50'}`}
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
            </CardContent>
          </Card>
          
          {/* Risk Status Card */}
          <RiskStatus 
            riskLevel={riskLevel} 
            prodigyScore={prodigyScore} 
            mewsScore={mewsScore} 
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
                  <span className="font-medium">{currentHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span>Breathing Rate:</span>
                  <span className="font-medium">{currentBR} brpm</span>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VitalSignsMonitor;