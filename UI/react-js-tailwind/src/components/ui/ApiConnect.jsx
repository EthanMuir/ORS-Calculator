// src/components/ui/ApiConnect.jsx

import React, { useState } from 'react';
import { Button } from './button.jsx';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';

const ApiConnect = ({ onConnect, onDisconnect, isConnected }) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [serverUrl, setServerUrl] = useState("http://localhost:5030");  // Updated port to match server

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    
    try {
      // Pass the server URL to the connect function
      const success = await onConnect(serverUrl);
      if (!success) {
        setError("Failed to connect to the server. Please check that the server is running.");
      }
    } catch (error) {
      console.error("API connection error:", error);
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
          <span className="text-sm font-medium text-gray-700">Server Connection</span>
          <span className={`text-sm font-medium ${isConnected ? 'text-green-500' : 'text-gray-500'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        <div className="flex mb-2">
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            className="flex-grow p-2 text-sm border border-gray-300 rounded-l-md"
            placeholder="http://localhost:5030"
          />
        </div>
        
        {isConnected ? (
          <Button 
            variant="outline" 
            className="border-red-500 text-red-500 hover:bg-red-50 w-full"
            onClick={handleDisconnect}
          >
            <WifiOff className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        ) : (
          <Button 
            variant="default" 
            className="bg-blue-500 hover:bg-blue-600 text-white w-full"
            onClick={handleConnect}
            disabled={connecting}
          >
            <Wifi className="h-4 w-4 mr-2" />
            {connecting ? "Connecting..." : "Connect to Server"}
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
          Successfully connected to the OIRD server.
        </div>
      )}
    </div>
  );
};

export default ApiConnect;