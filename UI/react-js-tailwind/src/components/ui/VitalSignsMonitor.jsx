import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx'; // Relative path
import { Button } from './button.jsx'; // Relative path
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx'; // Relative path
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const VitalSignsMonitor = () => {
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
  
  // Animation frame reference
  const animationRef = useRef(null);
  const timeRef = useRef(0);
  
  // Constants for healthy ranges
  const HR_MIN_HEALTHY = 60;
  const HR_MAX_HEALTHY = 100;
  const BR_MIN_HEALTHY = 12;
  const BR_MAX_HEALTHY = 20;
  
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
    timeRef.current += 1;
    const time = timeRef.current;
    const { hr, br } = generateRandomVitals(time);
    
    setHrData(prevData => {
      const newData = [...prevData.slice(1), { value: hr, time }];
      return newData;
    });
    
    setBrData(prevData => {
      const newData = [...prevData.slice(1), { value: br, time }];
      return newData;
    });
    
    // Update status based on vital signs
    if (hr < HR_MIN_HEALTHY || hr > HR_MAX_HEALTHY || 
        br < BR_MIN_HEALTHY || br > BR_MAX_HEALTHY) {
      setStatus("AT RISK");
    } else {
      setStatus("NORMAL");
    }
    
    setCurrentTime(time);
  };
  
  // Animation loop
  const animationLoop = () => {
    updateData();
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animationLoop);
    }
  };
  
  // Effect to handle animation starting/stopping
  useEffect(() => {
    if (isRunning) {
      animationRef.current = requestAnimationFrame(animationLoop);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRunning]);
  
  // Start monitoring
  const startMonitoring = () => {
    setIsRunning(true);
  };
  
  // Stop monitoring
  const stopMonitoring = () => {
    setIsRunning(false);
  };
  
  // Run healthy simulation
  const runHealthySimulation = () => {
    stopMonitoring();
    const simulation = generateHealthySimulation();
    let index = 0;
    
    const runSimulation = () => {
      if (index < simulation.length) {
        const { hr, br, time } = simulation[index];
        
        setHrData(prevData => {
          const newData = [...prevData.slice(1), { value: hr, time }];
          return newData;
        });
        
        setBrData(prevData => {
          const newData = [...prevData.slice(1), { value: br, time }];
          return newData;
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
        setTimeout(runSimulation, 100);
      }
    };
    
    // Reset time reference and start simulation
    timeRef.current = 0;
    runSimulation();
  };
  
  // Run unhealthy simulation
  const runUnhealthySimulation = () => {
    stopMonitoring();
    const simulation = generateUnhealthySimulation();
    let index = 0;
    
    const runSimulation = () => {
      if (index < simulation.length) {
        const { hr, br, time } = simulation[index];
        
        setHrData(prevData => {
          const newData = [...prevData.slice(1), { value: hr, time }];
          return newData;
        });
        
        setBrData(prevData => {
          const newData = [...prevData.slice(1), { value: br, time }];
          return newData;
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
        setTimeout(runSimulation, 100);
      }
    };
    
    // Reset time reference and start simulation
    timeRef.current = 0;
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
        {/* Left column - Controls */}
        <div className="flex flex-col gap-4">
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
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card className="shadow-md mt-auto">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Status:</span>
                <span className={`font-bold text-xl ${statusColor}`}>{status}</span>
              </div>
              <div className="mt-2 text-sm text-gray-500">
                <div>Heart Rate: {currentHR} bpm</div>
                <div>Breathing Rate: {currentBR} brpm</div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Graphs */}
        <div className="flex flex-col gap-4">
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Heart Rate</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hrData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    domain={[Math.max(0, currentTime - 10), Math.max(10, currentTime)]}
                    type="number"
                    tickFormatter={(tick) => Math.max(0, tick).toFixed(0)}
                  />
                  <YAxis domain={[40, 120]} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#007AFF" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-xl">Breathing Rate</CardTitle>
            </CardHeader>
            <CardContent className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={brData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="time" 
                    domain={[Math.max(0, currentTime - 10), Math.max(10, currentTime)]}
                    type="number"
                    tickFormatter={(tick) => Math.max(0, tick).toFixed(0)}
                  />
                  <YAxis domain={[5, 25]} />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#5AC8FA" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VitalSignsMonitor;