import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card.jsx';

const RiskStatus = ({ riskLevel,  prodigyScore, mewsScore, avgRisk}) => {
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
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl">Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">Alert Level:</span>
          <span className={`font-bold text-xl ${avgRisk>0.6 ? "text-red-500" : "text-gray-500"}`}>{avgRisk>0.6 ? "ALERT" : "No Alert"}</span>
        </div>
        <div className="flex justify-between items-center">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskStatus;