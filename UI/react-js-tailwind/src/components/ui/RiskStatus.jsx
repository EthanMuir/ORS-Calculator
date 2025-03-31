import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const RiskStatus = ({ riskLevel, prodigyScore, mewsScore, avgRisk, currentAlertLevel }) => {
  // Use the provided alertLevel if available, otherwise calculate it
  const alertLevel = currentAlertLevel !== undefined ? 
    currentAlertLevel : 
    getAlertLevel(avgRisk);

  // Determine risk color based on risk level
  const getRiskColor = () => {
    switch (riskLevel) {
      case "Not at Risk":
        return "text-green-500";
      case "Moderate Risk":
        return "text-yellow-500";
      case "High Risk":
        return "text-red-500";
      case "AT RISK": // Handle the current status format
        return "text-red-500";
      case "NORMAL": // Handle the current status format
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const riskColor = getRiskColor();

  // Get alert level based on avgRisk - same thresholds as AlertSystem
  const getAlertLevel = (avgRisk) => {
    if (avgRisk >= 0.9) return 3; // Critical
    if (avgRisk >= 0.75) return 2; // Warning
    if (avgRisk >= 0.6) return 1; // Watch
    return 0; // No alert
  };

  // Then use this consistently in your component  
  // Get alert display text - matches the alert banner text
  const getAlertText = () => {
    switch (alertLevel) {
      case 3:
        return "CRITICAL";
      case 2:
        return "WARNING";
      case 1:
        return "WATCH";
      default:
        return "No Alert";
    }
  };
  
  // Get alert color - matches the alert banner colors
  const getAlertTextColor = () => {
    switch (alertLevel) {
      case 3:
        return "text-red-500";
      case 2:
        return "text-orange-500";
      case 1:
        return "text-yellow-500";
      default:
        return "text-gray-500";
    }
  };
  
  // Get alert icon - matches the alert banner icons
  const getAlertIcon = () => {
    switch (alertLevel) {
      case 3:
      case 2:
        return <AlertTriangle className={`h-5 w-5 ${getAlertTextColor()} mr-2`} />;
      case 1:
        return <AlertCircle className={`h-5 w-5 ${getAlertTextColor()} mr-2`} />;
      default:
        return null;
    }
  };
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Alert Level:</span>
          <div className="flex items-center">
            {getAlertIcon()}
            <span className={`font-bold text-xl ${getAlertTextColor()}`}>
              {getAlertText()}
            </span>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="font-semibold text-lg">Risk Level:</span>
          <span className={`font-bold text-xl ${riskColor}`}>{riskLevel}</span>
        </div>
        <div className="mt-4 text-sm text-gray-500">
          <div className="flex justify-between mb-2">
            <span>PRODIGY Score:</span>
            <span className="font-medium">{prodigyScore}/39</span>
          </div>
          <div className="flex justify-between">
            <span>MEWS Score:</span>
            <span className="font-medium">{mewsScore}/6</span>
          </div>
          <div className="flex justify-between mt-2">
            <span>Risk %:</span>
            <span className="font-medium">{(avgRisk * 100).toFixed(1)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskStatus;