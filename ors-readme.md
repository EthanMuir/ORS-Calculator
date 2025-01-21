# Opioid-Related Respiratory Depression (OIRD) Risk Calculator

## Overview
This algorithm calculates a patient's risk of developing opioid-related respiratory depression (OIRD) by combining static risk factors (PRODIGY score) with real-time physiological measurements to produce an Overall Risk Score (ORS).

## Input Parameters

### Patient Demographics and History
- **age**: Patient's age in years
  - Example: 65
  - Range: 18-100
  - Impact: Higher risk for patients over 60

- **gender**: Patient's biological sex
  - Values: "male" or "female"
  - Impact: Males have slightly higher risk

- **sleep_apnea**: History of sleep apnea
  - Values: true/false
  - Impact: Significant risk factor if present

- **opioid_dosage**: Current opioid dosage in morphine milligram equivalents (MME)
  - Example: 75.0
  - Range: 0-200+
  - Impact: Risk increases with dosage
  - Thresholds:
    - Low risk: < 50 MME
    - Moderate risk: 50-100 MME
    - High risk: > 100 MME

- **sedative_use**: Concurrent use of sedatives
  - Values: true/false
  - Impact: Significant risk multiplier

### Optional Patient Factors
- **bmi**: Body Mass Index
  - Example: 32.5
  - Range: 15-60
  - Risk thresholds:
    - Increased risk: > 30
    - High risk: > 35
    - Severe risk: > 40

- **copd**: Chronic Obstructive Pulmonary Disease status
  - Values: true/false
  - Impact: Significant risk factor if present

- **asa_status**: ASA Physical Status Classification
  - Range: 1-4
  - Impact increases with higher values:
    - ASA 1: Normal healthy patient
    - ASA 2: Mild systemic disease
    - ASA 3: Severe systemic disease
    - ASA 4: Severe disease that is constant threat to life

### Real-Time Physiological Measurements
- **recent_breathing_rate**: Average breaths per minute over last 10 minutes
  - Example: 16.0
  - Normal range: 12-20
  - Critical thresholds:
    - < 8: Severe depression
    - > 24: Respiratory distress

- **current_breathing_rate**: Current breaths per minute
  - Example: 14.0
  - Normal range: 12-20
  - Compared against recent rate for trend analysis

- **heart_rate**: Current heart rate in beats per minute
  - Example: 72.0
  - Normal range: 60-100
  - Risk indicators:
    - < 50: Bradycardia
    - > 100: Tachycardia

- **breath_amplitude**: Strength of respiratory effort
  - Range: 0-10
  - Example: 7.0
  - Impact: Lower values indicate respiratory depression

- **spo2**: Blood oxygen saturation percentage
  - Example: 96.0
  - Normal range: 95-100%
  - Critical thresholds:
    - < 90%: Severe desaturation
    - < 85%: Critical desaturation

- **etco2**: End-tidal CO2 in mmHg
  - Example: 40.0
  - Normal range: 35-45 mmHg
  - Risk indicators:
    - < 30: Hyperventilation
    - > 50: Hypoventilation

## Algorithm Operation

### 1. PRODIGY Score Calculation
The algorithm first calculates a base risk score using the PRODIGY (PRediction of Opioid-induced respiratory Depression In patients monitored by capnoGraphY) methodology:

1. Evaluates static risk factors:
   - Age-based risk scaling
   - Gender-specific weighting
   - Sleep apnea status
   - Opioid dosage thresholds
   - Sedative use impact

2. Incorporates optional risk factors:
   - BMI-based risk scaling
   - COPD impact
   - ASA status weighting

3. Normalizes the score to 0-100 scale

### 2. Real-Time Risk Assessment
The algorithm then processes real-time physiological data:

1. Calculates deviation scores for vital signs:
   - Compares current values against normal ranges
   - Applies non-linear scaling for severe deviations
   - Weights deviations based on clinical significance

2. Analyzes breathing patterns:
   - Compares current vs. recent breathing rates
   - Evaluates breath amplitude
   - Assesses oxygenation (SpO2) and ventilation (EtCO2)

### 3. Overall Risk Score (ORS) Computation
The final ORS is calculated through:

1. Weighted combination of:
   - Normalized PRODIGY score (25%)
   - Breathing parameters (30%)
   - Heart rate deviation (15%)
   - Breath amplitude (10%)
   - SpO2 and EtCO2 (20% combined)

2. Application of exponential scaling to enhance sensitivity to high-risk situations

3. Risk level categorization:
   - Critical Risk: ORS > 0.85
   - High Risk: ORS > 0.70
   - Moderate Risk: ORS > 0.45
   - Low Risk: ORS > 0.25
   - Minimal Risk: ≤ 0.25

## Usage Example
```json
{
    "age": 62,
    "gender": "male",
    "sleep_apnea": true,
    "opioid_dosage": 75.0,
    "sedative_use": false,
    "bmi": 31.2,
    "copd": false,
    "asa_status": 2,
    "recent_breathing_rate": 18.0,
    "current_breathing_rate": 21.0,
    "heart_rate": 88.0,
    "breath_amplitude": 6.0,
    "spo2": 94.0,
    "etco2": 47.0
}
```

This patient would be classified as Moderate Risk due to:
- Multiple moderate risk factors (age, sleep apnea, BMI)
- Elevated but not critical opioid dosage
- Slightly abnormal vital signs
- No critical individual values

## Clinical Implementation Notes
- Algorithm should be used as part of a comprehensive patient monitoring strategy
- Risk scores are dynamic and should be regularly reassessed
- Immediate clinical judgment should always take precedence
- Algorithm is designed to be conservative in risk assessment
- Regular calibration against clinical outcomes is recommended

## Error Handling
The algorithm includes validation for:
- Input range checking
- Missing data handling
- Type validation
- Proper error messaging for invalid inputs

## Limitations
- Algorithm is a decision support tool, not a replacement for clinical judgment
- Requires accurate and consistent vital sign measurements
- Some risk factors may not be captured
- Regular validation against patient outcomes is recommended
