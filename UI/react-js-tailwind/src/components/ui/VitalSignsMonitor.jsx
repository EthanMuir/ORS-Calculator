import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx'; // Relative path
import { Button } from './button.jsx'; // Relative path
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx'; // Relative path
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Label } from 'recharts';

const VitalSignsMonitor = () => {
  // Track whether monitoring has actually started
  const isInitialRun = useRef(true);

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
      // Start the timeout-based update loop
      simulationTimeoutRef.current = setTimeout(updateData, 100);
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
  }, [isRunning]);
  
  // Start monitoring
  const startMonitoring = () => {
    resetMonitor();
    lastUpdateTimeRef.current = Date.now(); // Set the start time
    setIsRunning(true);
  };
  
  // Stop monitoring
  const stopMonitoring = () => {
    setIsRunning(false);
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
  
  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-4">Vital Signs Monitor</h1>
      
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
                      disabled={!isRunning}
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
            </CardContent>
          </Card>
          
          {/* Status Card */}
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Patient Status:</span>
                <span className={`font-bold text-xl ${statusColor}`}>{status}</span>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                <div className="flex justify-between mb-2">
                  <span>Heart Rate:</span>
                  <span className="font-medium">{currentHR} bpm</span>
                </div>
                <div className="flex justify-between">
                  <span>Breathing Rate:</span>
                  <span className="font-medium">{currentBR} brpm</span>
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
                    domain={hrData.length > 100 ? 
                      ['dataMin', 'dataMax'] : 
                      [0, 10]}
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
                    domain={brData.length > 100 ? 
                      ['dataMin', 'dataMax'] : 
                      [0, 10]}
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