import React from 'react';
import { BrainCircuit } from 'lucide-react';

const ModelStatus = ({ isLoaded, isLoading, error }) => {
  // Determine the status text and color
  let statusText = "Neural Network: ";
  let statusColor = "";
  let icon = null;
  
  if (isLoaded) {
    statusText += "Active";
    statusColor = "text-green-500";
    icon = <BrainCircuit className="h-4 w-4 mr-2 text-green-500" />;
  } else if (isLoading) {
    statusText += "Loading...";
    statusColor = "text-amber-500";
    icon = (
      <div className="h-4 w-4 mr-2 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
    );
  } else if (error) {
    statusText += "Failed";
    statusColor = "text-red-500";
    icon = <BrainCircuit className="h-4 w-4 mr-2 text-red-500" />;
  } else {
    statusText += "Not Loaded";
    statusColor = "text-gray-400";
    icon = <BrainCircuit className="h-4 w-4 mr-2 text-gray-400" />;
  }
  
  return (
    <div className={`flex items-center text-sm ${statusColor} mt-4 border-t border-gray-100 pt-4`}>
      {icon}
      <span>{statusText}</span>
    </div>
  );
};

export default ModelStatus;