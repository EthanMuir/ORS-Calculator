// src/utils/RiskCalculator.js

// Calculate PRODIGY risk score based on patient data
export const calculateProdigyScore = (age, sex, opioidNaive, sdb, chf) => {
    let score = 0;
    
    // Age scoring
    if (age < 60) {
      score += 0;
    } else if (age >= 60 && age <= 69) {
      score += 8;
    } else if (age >= 70 && age <= 79) {
      score += 12;
    } else { // age >= 80
      score += 16;
    }
    
    // Sex scoring
    if (sex.toLowerCase() === 'male') {
      score += 8;
    }
    
    // Opioid use scoring
    if (opioidNaive) {
      score += 3;
    }
    
    // Sleep disordered breathing (SDB) scoring
    if (sdb) {
      score += 5;
    }
    
    // Chronic heart failure (CHF) scoring
    if (chf) {
      score += 7;
    }
    
    return score;
  };
  
  // Calculate MEWS score based on vital signs
  export const calculateMewsScore = (heartRate, breathingRate, temperature = 36, avpu = "Alert", systolicBp = 120) => {
    // Heart rate scoring
    let hrScore = 0;
    if (heartRate < 40) {
      hrScore = 2;
    } else if (heartRate >= 40 && heartRate <= 50) {
      hrScore = 1;
    } else if (heartRate >= 51 && heartRate <= 100) {
      hrScore = 0;
    } else if (heartRate >= 101 && heartRate <= 110) {
      hrScore = 1;
    } else if (heartRate >= 111 && heartRate <= 129) {
      hrScore = 2;
    } else {
      hrScore = 3;
    }
  
    // Systolic BP scoring
    let bpScore = 0;
    if (systolicBp <= 70) {
      bpScore = 3;
    } else if (systolicBp >= 71 && systolicBp <= 80) {
      bpScore = 2;
    } else if (systolicBp >= 81 && systolicBp <= 100) {
      bpScore = 1;
    } else if (systolicBp >= 101 && systolicBp <= 199) {
      bpScore = 0;
    } else {
      bpScore = 2;
    }
  
    // Temperature scoring
    let tempScore = 0;
    if (temperature < 35) {
      tempScore = 2;
    } else if (temperature >= 35 && temperature <= 38.4) {
      tempScore = 0;
    } else {
      tempScore = 2;
    }
  
    // AVPU scoring
    const avpuScores = {
      "Alert": 0,
      "Verbal": 1,
      "Pain": 2,
      "Unresponsive": 3
    };
    const avpuScore = avpuScores[avpu] || 0;
  
    // Breathing rate scoring
    let breathScore = 0;
    if (breathingRate < 9) {
      breathScore = 2;
    } else if (breathingRate >= 9 && breathingRate <= 14) {
      breathScore = 0;
    } else if (breathingRate >= 15 && breathingRate <= 20) {
      breathScore = 1;
    } else if (breathingRate >= 21 && breathingRate <= 29) {
      breathScore = 2;
    } else {
      breathScore = 3;
    }
  
    // Total MEWS score
    const totalScore = hrScore + bpScore + tempScore + avpuScore + breathScore;
    
    return totalScore;
  };
  
 // Mathematical boundary definitions
 export const riskBoundaries = {
  // Low-Medium boundary equation (purple to teal/yellow)
  lowMediumBoundary: (mews) => {
    if (mews <= 1.2) return 39; // Everything below MEWS≈1.2 is low risk
    if (mews <= 2) {
      // Steep curve from MEWS=1.2 to MEWS=2
      const t = (mews - 1.2) / 0.8; // Normalized position between 1.2 and 2
      return 39 - t * t * 18; // Quadratic curve drop
    }
    
    // After MEWS=2, the boundary shifts to separate medium/high instead
    return 3;
  },
  
  // Medium-High boundary equation (teal to yellow)
  mediumHighBoundary: (mews) => {
    if (mews < 2) return 30; // Below MEWS=2, medium risk is a narrow band
    
    // Main curve between MEWS=2 and MEWS=3
    if (mews <= 3) {
      return 21 - 2 * (mews - 2) * (mews - 2);
    }
    
    // Secondary curve between MEWS=3 and MEWS=4
    if (mews <= 4) {
      const t = (mews - 3) / 1;
      return 17 - 5 * t;
    }
    
    // Final curve between MEWS=4 and MEWS=5
    if (mews <= 5) {
      const t = (mews - 4) / 1;
      return 12 - 7 * t;
    }
    
    return 0; // Above MEWS=5, everything is high risk
  },
  
  // Special medium risk regions (the isolated islands in the graph)
  isInMediumIsland: (mews, prodigy) => {
    // Island near MEWS=3
    if (mews >= 2.7 && mews <= 3.3) {
      const centerY = 7 + (mews - 3) * 8;
      const height = 10 - Math.abs(mews - 3) * 5;
      return (prodigy >= centerY - height/2) && (prodigy <= centerY + height/2);
    }
    
    // Island near MEWS=4
    if (mews >= 3.7 && mews <= 4.3) {
      const centerY = 11 - (mews - 4) * 2;
      const height = 8 - Math.abs(mews - 4) * 4;
      return (prodigy >= centerY - height/2) && (prodigy <= centerY + height/2);
    }
    
    // Island near MEWS=5
    if (mews >= 4.7 && mews <= 5.3) {
      const centerY = 5 - (mews - 5) * 2;
      const height = 6 - Math.abs(mews - 5) * 3;
      return (prodigy >= centerY - height/2) && (prodigy <= centerY + height/2);
    }
    
    return false;
  }
};

// Function to determine risk level given MEWS and PRODIGY scores
export const getRiskLevel = (mews, prodigy) => {
  // Check for medium risk islands first
  if (riskBoundaries.isInMediumIsland(mews, prodigy)) {
    return 'medium';
  }
  
  // Main boundaries
  if (mews <= 2) {
    // For MEWS <= 2, use the low-medium boundary
    if (prodigy <= riskBoundaries.lowMediumBoundary(mews)) {
      return 'low';
    } else {
      return 'high'; // There's very little medium in this region
    }
  } else {
    // For MEWS > 2
    if (prodigy <= 3) { // The small low region that extends
      return 'low';
    } else if (prodigy <= riskBoundaries.mediumHighBoundary(mews)) {
      return 'medium';
    } else {
      return 'high';
    }
  }
};

// Classification based on the updated mathematical boundaries
export const classifyRisk = (mewsScore, prodigyScore) => {
  // Ensure values are within bounds
  const mews = Math.min(Math.max(mewsScore, 0), 6);
  const prodigy = Math.min(Math.max(prodigyScore, 0), 39);
  
  // Get risk level using the boundary equations
  const riskLevel = getRiskLevel(mews, prodigy);
  
  // Map the risk level to UI-friendly names
  const riskNameMap = {
    'low': 'Not at Risk',
    'medium': 'Moderate Risk',
    'high': 'High Risk'
  };
  
  // Calculate probability based on distance from boundaries and position
  let probabilities = { low: 0, moderate: 0, high: 0 };
  
  if (riskLevel === 'low') {
    // For low risk, calculate distance from boundary
    let confidence;
    
    if (mews <= 1) {
      // Far left region - very high confidence of low risk
      confidence = 0.9;
    } else if (mews <= 2) {
      // Near the boundary - confidence based on distance
      const boundaryY = riskBoundaries.lowMediumBoundary(mews);
      const distance = Math.max(0, boundaryY - prodigy) / 10;
      confidence = 0.7 + 0.2 * Math.min(1, distance);
    } else {
      // Extended low region - moderate confidence
      confidence = 0.75;
    }
    
    probabilities = {
      low: confidence,
      moderate: (1 - confidence) * 0.7,
      high: (1 - confidence) * 0.3
    };
  } 
  else if (riskLevel === 'medium') {
    // For medium risk (including islands)
    let mediumConfidence;
    
    if (riskBoundaries.isInMediumIsland(mews, prodigy)) {
      // In medium islands - moderate confidence
      mediumConfidence = 0.75;
    } else {
      // In main medium region - higher confidence
      mediumConfidence = 0.85;
    }
    
    probabilities = {
      low: (1 - mediumConfidence) * 0.4,
      moderate: mediumConfidence,
      high: (1 - mediumConfidence) * 0.6
    };
  } 
  else { // high risk
    // For high risk - calculate confidence based on position
    let confidence;
    
    if (mews >= 5 || prodigy >= 30) {
      // Far right or top region - very high confidence
      confidence = 0.9;
    } else {
      // Closer to boundary - moderate confidence
      confidence = 0.75;
    }
    
    probabilities = {
      low: (1 - confidence) * 0.1,
      moderate: (1 - confidence) * 0.5,
      high: confidence
    };
  }
  
  // Normalize probabilities to ensure they sum to 1
  const sum = probabilities.low + probabilities.moderate + probabilities.high;
  probabilities.low = probabilities.low / sum;
  probabilities.moderate = probabilities.moderate / sum;
  probabilities.high = probabilities.high / sum;
  
  return {
    riskName: riskNameMap[riskLevel],
    probabilities
  };
};