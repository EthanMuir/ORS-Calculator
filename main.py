import json
from typing import Tuple, Dict, Union
import math

class CalcClass:
    def calculate_prodigy_score(self, age: int, sex: str, opioid_naive: bool, sdb: bool, chf: bool) -> int:
        """
        Calculate the PRODIGY risk score based on age, sex, opioid use, sleep disordered breathing, and chronic heart failure.
        
        Parameters:
            age (int): Patient's age
            sex (str): 'male' or 'female'
            opioid_naive (bool): True if opioid naïve, False if previous opioid use
            sdb (bool): True if known sleep disordered breathing (SDB) or high STOP-BANG score
            chf (bool): True if coexisting chronic heart failure (CHF)

        Returns:
            int: Total PRODIGY risk score
        """
        score = 0
        
        # Age scoring
        if age < 60:
            score += 0
        elif 60 <= age <= 69:
            score += 8
        elif 70 <= age <= 79:
            score += 12
        else:  # age >= 80
            score += 16
        
        # Sex scoring
        if sex.lower() == 'male':
            score += 8
        
        # Opioid use scoring
        if opioid_naive:
            score += 3
        
        # Sleep disordered breathing (SDB) scoring
        if sdb:
            score += 5
        
        # Chronic heart failure (CHF) scoring
        if chf:
            score += 7
        
        return score

    def calculate_ors(
        self,
        prodigy_score: float,
        recent_breathing_rate: float,
        current_breathing_rate: float,
        heart_rate: float,
        breath_amplitude: float,
    ) -> Tuple[float, str]:
        """Calculate ORS with refined risk assessment."""
        NORMAL_RANGES = {
            'breathing_rate': (12, 20),
            'heart_rate': (60, 100),
        }
        
        def calculate_deviation_score(value: float, normal_range: Tuple[float, float]) -> float:
            if value < normal_range[0]:
                deviation = (normal_range[0] - value) / normal_range[0]
                return deviation * 1.5 if deviation > 0.3 else deviation
            elif value > normal_range[1]:
                deviation = (value - normal_range[1]) / normal_range[1]
                return deviation * 1.5 if deviation > 0.3 else deviation
            return 0.0

        weights = {
            'prodigy': 0.4,
            'recent_breathing': 0.25,
            'current_breathing': 0.25,
            'heart_rate': 0.1,
        }
        
        normalized_prodigy = prodigy_score / 39
        
        breathing_deviation = calculate_deviation_score(current_breathing_rate, NORMAL_RANGES['breathing_rate'])
        recent_breathing_deviation = calculate_deviation_score(recent_breathing_rate, NORMAL_RANGES['breathing_rate'])
        heart_rate_deviation = calculate_deviation_score(heart_rate, NORMAL_RANGES['heart_rate'])
        
        ors = (
            weights['prodigy'] * normalized_prodigy +
            weights['recent_breathing'] * recent_breathing_deviation +
            weights['current_breathing'] * breathing_deviation +
            weights['heart_rate'] * heart_rate_deviation
        )
        
        ors = 1 - math.exp(-2.2 * ors)
        
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

    def load_patient_data(self, file_path: str) -> Dict[str, Union[str, float, bool, int]]:
        """Load patient data from a JSON file."""
        with open(file_path, 'r') as file:
            return json.load(file)

if __name__ == "__main__":
    calc = CalcClass()
    file_path = input("Enter the path to the patient data file: ")
    patient_data = calc.load_patient_data(file_path)
    
    prodigy_score = calc.calculate_prodigy_score(
        age=patient_data['age'],
        sex=patient_data['sex'],
        sdb=patient_data['sdb'],
        opioid_naive=patient_data['opioid_naive'],
        chf=patient_data['chf']
    )
    
    ors, risk_level = calc.calculate_ors(
        prodigy_score,
        patient_data['recent_breathing_rate'],
        patient_data['current_breathing_rate'],
        patient_data['heart_rate'],
        patient_data['breath_amplitude'],
    )
    
    print("\nRisk Assessment Results:")
    print("-" * 50)
    print(f"PRODIGY Risk Score: {prodigy_score:.2f}39")
    print(f"Overall Risk Score (ORS): {ors:.3f}")
    print(f"Risk Level: {risk_level}")
    print("-" * 50)