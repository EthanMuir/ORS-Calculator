import json
from typing import Tuple, Dict, Union
import math

def calculate_prodigy_score(
    age: int,
    gender: str,
    sleep_apnea: bool,
    opioid_dosage: float,
    sedative_use: bool,
    bmi: float = None,
    copd: bool = False,
    asa_status: int = None
) -> float:
    """Calculate PRODIGY risk score with enhanced weighting."""
    weights = {
        'age': {
            'weight': 0.0,
            'thresholds': [(50, 0.15), (60, 0.25), (70, 0.35), (80, 0.45)]
        },
        'gender': {
            'male': 0.20,
            'female': 0.10
        },
        'sleep_apnea': 0.35,
        'opioid': {
            'thresholds': [(50, 0.20), (100, 0.35), (200, 0.50)]
        },
        'sedative': 0.35,
        'bmi': {
            'thresholds': [(30, 0.15), (35, 0.25), (40, 0.35)]
        },
        'copd': 0.25,
        'asa': {
            'thresholds': [(2, 0.15), (3, 0.25), (4, 0.35)]
        }
    }
    
    # Calculate weights with enhanced risk factors
    age_weight = max((weight for threshold, weight in weights['age']['thresholds'] if age >= threshold), default=0.0)
    opioid_weight = max((weight for threshold, weight in weights['opioid']['thresholds'] if opioid_dosage >= threshold), default=0.0)
    
    score = (
        age_weight +
        weights['gender'][gender.lower()] +
        (weights['sleep_apnea'] if sleep_apnea else 0) +
        opioid_weight +
        (weights['sedative'] if sedative_use else 0)
    )
    
    # Add optional risk factors with enhanced sensitivity
    if bmi is not None:
        bmi_weight = max((weight for threshold, weight in weights['bmi']['thresholds'] if bmi >= threshold), default=0.0)
        score += bmi_weight
    
    if copd:
        score += weights['copd']
    
    if asa_status is not None:
        asa_weight = max((weight for threshold, weight in weights['asa']['thresholds'] if asa_status >= threshold), default=0.0)
        score += asa_weight
    
    return min(100, score * 100)

def calculate_ors(
    prodigy_score: float,
    recent_breathing_rate: float,
    current_breathing_rate: float,
    heart_rate: float,
    breath_amplitude: float,
    spo2: float = None,
    etco2: float = None
) -> Tuple[float, str]:
    """Calculate ORS with enhanced risk stratification."""
    NORMAL_RANGES = {
        'breathing_rate': (12, 20),
        'heart_rate': (60, 100),
        'spo2': (95, 100),
        'etco2': (35, 45)
    }
    
    def calculate_deviation_score(value: float, normal_range: Tuple[float, float]) -> float:
        """Enhanced deviation scoring with progressive risk."""
        if value < normal_range[0]:
            deviation = (normal_range[0] - value) / normal_range[0]
            return deviation * (1.5 if deviation > 0.3 else 1.0)
        elif value > normal_range[1]:
            deviation = (value - normal_range[1]) / normal_range[1]
            return deviation * (1.5 if deviation > 0.3 else 1.0)
        return 0.0

    weights = {
        'prodigy': 0.35,
        'recent_breathing': 0.15,
        'current_breathing': 0.15,
        'heart_rate': 0.10,
        'breath_amplitude': 0.15,
        'spo2': 0.05,
        'etco2': 0.05
    }
    
    normalized_prodigy = prodigy_score / 100
    
    breathing_deviation = calculate_deviation_score(current_breathing_rate, NORMAL_RANGES['breathing_rate'])
    recent_breathing_deviation = calculate_deviation_score(recent_breathing_rate, NORMAL_RANGES['breathing_rate'])
    heart_rate_deviation = calculate_deviation_score(heart_rate, NORMAL_RANGES['heart_rate'])
    
    # Enhanced breath amplitude risk calculation
    normalized_amplitude = max(0, min(1, breath_amplitude / 10))
    amplitude_risk = (1 - normalized_amplitude) * 1.5
    
    ors = (
        weights['prodigy'] * normalized_prodigy +
        weights['recent_breathing'] * recent_breathing_deviation +
        weights['current_breathing'] * breathing_deviation +
        weights['heart_rate'] * heart_rate_deviation +
        weights['breath_amplitude'] * amplitude_risk
    )
    
    # Enhanced SpO2 and EtCO2 risk calculation
    if spo2 is not None:
        spo2_deviation = calculate_deviation_score(spo2, NORMAL_RANGES['spo2'])
        if spo2 < 92:
            spo2_deviation *= 2.0
        ors += weights['spo2'] * spo2_deviation
    
    if etco2 is not None:
        etco2_deviation = calculate_deviation_score(etco2, NORMAL_RANGES['etco2'])
        if etco2 < 30 or etco2 > 50:
            etco2_deviation *= 2.0
        ors += weights['etco2'] * etco2_deviation
    
    # Enhanced exponential scaling
    ors = 1 - math.exp(-2.2 * ors)
    
    # Recalibrated risk thresholds
    if ors > 0.65:
        risk_level = "Critical Risk - Immediate Intervention Required"
    elif ors > 0.45:
        risk_level = "High Risk - Close Monitoring Required"
    elif ors > 0.25:
        risk_level = "Moderate Risk - Regular Monitoring"
    elif ors > 0.15:
        risk_level = "Low Risk - Standard Monitoring"
    else:
        risk_level = "Minimal Risk - Routine Care"
        
    return ors, risk_level

def load_patient_data(file_path: str) -> Dict[str, Union[str, float, bool, int]]:
    """Load patient data from a JSON file."""
    with open(file_path, 'r') as file:
        return json.load(file)

if __name__ == "__main__":
    file_path = input("Enter the path to the patient data file: ")
    patient_data = load_patient_data(file_path)
    
    # Calculate enhanced PRODIGY score with additional risk factors
    prodigy_score = calculate_prodigy_score(
        age=patient_data['age'],
        gender=patient_data['gender'],
        sleep_apnea=patient_data['sleep_apnea'],
        opioid_dosage=patient_data['opioid_dosage'],
        sedative_use=patient_data['sedative_use'],
        bmi=patient_data.get('bmi'),
        copd=patient_data.get('copd', False),
        asa_status=patient_data.get('asa_status')
    )
    
    # Calculate enhanced ORS with additional vital signs
    ors, risk_level = calculate_ors(
        prodigy_score,
        patient_data['recent_breathing_rate'],
        patient_data['current_breathing_rate'],
        patient_data['heart_rate'],
        patient_data['breath_amplitude'],
        patient_data.get('spo2'),
        patient_data.get('etco2')
    )
    
    # Output detailed results
    print("\nRisk Assessment Results:")
    print("-" * 50)
    print(f"PRODIGY Risk Score: {prodigy_score:.2f}/100")
    print(f"Overall Risk Score (ORS): {ors:.3f}")
    print(f"Risk Level: {risk_level}")
    print("-" * 50)