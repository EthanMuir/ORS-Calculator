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
  
  // Simple risk classifier (placeholder for the Neural Network)
  export const classifyRisk = (mewsScore, prodigyScore) => {
    // This is a simplified version - in a real app you would use TensorFlow.js to load the .h5 model
    // Simple rule-based classification (matching the python logic):
    const weights = {
      prodigyModerate: 3,
      mewsModerate: 8,
      thetaModerate: -24,
      prodigyHigh: 5,
      mewsHigh: 14,
      thetaHigh: -70
    };
    
    // Moderate Calc
    const orsModerate = (
      weights.prodigyModerate * prodigyScore +
      weights.mewsModerate * mewsScore +
      weights.thetaModerate
    );
    
    // High Calc
    const orsHigh = (
      weights.prodigyHigh * prodigyScore +
      weights.mewsHigh * mewsScore +
      weights.thetaHigh
    );
  
    let riskLevel = "";
    if (orsModerate < 0) {
      riskLevel = "Not at Risk";
    } else {
      // orsModerate > 0
      if (orsHigh < 0) {
        riskLevel = "Moderate Risk";
      } else {
        riskLevel = "High Risk";
      }
    }
    
    return {
      riskName: riskLevel,
      probabilities: {
        low: orsModerate < 0 ? 0.8 : 0.2,
        moderate: (orsModerate >= 0 && orsHigh < 0) ? 0.7 : 0.2,
        high: orsHigh >= 0 ? 0.9 : 0.1
      }
    };
  };