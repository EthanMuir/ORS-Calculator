import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs.jsx';
import { Button } from './button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';
import { ArrowLeft } from 'lucide-react';

const Settings = ({ onBack, patientData, setPatientData }) => {
  // Local state to track form changes before saving
  const [localPatientData, setLocalPatientData] = useState(patientData || {
    age: 50,
    sex: "male",
    sdb: false,
    opioid_naive: false,
    chf: false
  });

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
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="patient">Patient Data</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
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
            
            <TabsContent value="connection" className="space-y-4">
              <div className="p-8 text-center text-gray-500">
                <p>Connection settings will be available in future updates.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;