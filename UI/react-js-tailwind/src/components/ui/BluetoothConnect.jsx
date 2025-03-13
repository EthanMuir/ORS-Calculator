// src/components/ui/BluetoothConnect.jsx

import React, { useState } from 'react';
import { Button } from './button.jsx';
import { Bluetooth, BluetoothOff, AlertCircle } from 'lucide-react';

const BluetoothConnect = ({ onConnect, onDisconnect, isConnected }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    
    try {
      if (!navigator.bluetooth) {
        setError("Web Bluetooth is not supported in your browser. Try Chrome, Edge, or Opera.");
        setConnecting(false);
        return;
      }
      
      const success = await onConnect();
      if (!success) {
        setError("Failed to connect to the device. Please make sure it's powered on and in range.");
      }
    } catch (error) {
      console.error("Bluetooth connection error:", error);
      setError(`Connection error: ${error.message}`);
    }
    
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    await onDisconnect();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">Bluetooth Connection</span>
          <span className={`text-sm font-medium ${isConnected ? 'text-green-500' : 'text-gray-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {isConnected ? (
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50 w-full"
            onClick={handleDisconnect}
          >
            <BluetoothOff className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        ) : (
          <Button 
            variant="default" 
            className="bg-blue-500 hover:bg-blue-600 text-white w-full"
            onClick={handleConnect}
            disabled={connecting}
          >
            <Bluetooth className="h-4 w-4 mr-2" />
            {connecting ? "Connecting..." : "Connect to Sensor"}
          </Button>
        )}
      </div>
      
      {error && (
        <div className="text-sm text-red-500 flex items-center mt-2">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
      
      {isConnected && (
        <div className="text-sm text-green-500 mt-2">
          Successfully connected to the OIRD sensor via Bluetooth.
        </div>
      )}
    </div>
  );
};

export default BluetoothConnect;