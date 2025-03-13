// src/components/ui/Settings.jsx - Updated version with Bluetooth Connection

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx';
import { Button } from './button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';
import { ArrowLeft, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import ApiConnect from './ApiConnect.jsx';

const Settings = ({ onBack, patientData, setPatientData, apiService }) => {
  // Local state to track form changes before saving
  const [localPatientData, setLocalPatientData] = useState(patientData || {
    age: 50,
    sex: "male",
    sdb: false,
    opioid_naive: false,
    chf: false
  });
  
  // API connection state
  const [isApiConnected, setIsApiConnected] = useState(false);
  
  // Check API status on component mount
  useEffect(() => {
    setIsApiConnected(apiService.isConnected);
    
    // Set up interval to check connection status
    const intervalId = setInterval(() => {
      setIsApiConnected(apiService.isConnected);
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [apiService]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Handle different input types
    setLocalPatientData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Save patient data
  const savePatientData = () => {
    setPatientData(localPatientData);
    // Optional: Show a success message
    alert("Patient data saved successfully");
  };
  
  // Connect to API server
  const connectApi = async (serverUrl) => {
    try {
      // Update the API URL if provided
      if (serverUrl) {
        apiService.setApiUrl(serverUrl);
      }
      
      const connected = await apiService.connect();
      if (connected) {
        setIsApiConnected(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error connecting to API:", error);
      return false;
    }
  };
  // Disconnect from API server
  const disconnectApi = async () => {
    await apiService.disconnect();
    setIsApiConnected(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 p-4">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          className="p-2 mr-2" 
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>
      
      <Card className="shadow-md flex-grow">
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="patient" className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="patient">Patient Data</TabsTrigger>
              <TabsTrigger value="connection">Server</TabsTrigger>
              <TabsTrigger value="system">System</TabsTrigger>
            </TabsList>
            
            <TabsContent value="patient" className="space-y-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Age: {localPatientData.age}
                  </label>
                  <input
                    type="range"
                    name="age"
                    min="0"
                    max="100"
                    value={localPatientData.age}
                    onChange={handleInputChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                    Sex
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="sex"
                        value="male"
                        checked={localPatientData.sex === "male"}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Male</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        name="sex"
                        value="female"
                        checked={localPatientData.sex === "female"}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Female</span>
                    </label>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">
                    Patient Conditions
                  </label>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="sdb"
                      id="sdb"
                      checked={localPatientData.sdb}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-500 rounded"
                    />
                    <label htmlFor="sdb" className="ml-2 text-sm text-gray-700">
                      Sleep Disordered Breathing (SDB)
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="opioid_naive"
                      id="opioid_naive"
                      checked={localPatientData.opioid_naive}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-500 rounded"
                    />
                    <label htmlFor="opioid_naive" className="ml-2 text-sm text-gray-700">
                      Opioid Naive
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="chf"
                      id="chf"
                      checked={localPatientData.chf}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-500 rounded"
                    />
                    <label htmlFor="chf" className="ml-2 text-sm text-gray-700">
                      Congestive Heart Failure (CHF)
                    </label>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  onClick={savePatientData}
                >
                  Save Patient Data
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="connection" className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                  <h3 className="text-md font-medium text-gray-800 mb-2">Server Connection</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect to the OIRD server to receive heart rate and breathing rate data.
                  </p>
                  <ApiConnect 
                    onConnect={connectApi}
                    onDisconnect={disconnectApi}
                    isConnected={isApiConnected}
                  />
                </div>
                
                {isApiConnected && (
                  <div className="p-4 bg-green-50 rounded-md border border-green-200">
                    <h3 className="text-md font-medium text-green-800 mb-2">Server Status</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Server:</span>
                        <span className="text-sm font-medium">OIRD Server</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Connection:</span>
                        <span className="text-sm font-medium">Active</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className="text-sm font-medium">Receiving Data</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
                <h3 className="text-md font-medium text-gray-800 mb-2">System Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version:</span>
                    <span className="text-sm font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Platform:</span>
                    <span className="text-sm font-medium">Web</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Bluetooth API:</span>
                    <span className="text-sm font-medium">
                      {navigator.bluetooth ? 'Supported' : 'Not Supported'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 mt-4">
                <Button className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Check for Updates
                </Button>
                <Button className="w-full bg-red-50 text-red-600 hover:bg-red-100">
                  Factory Reset
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;