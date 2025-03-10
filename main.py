import json
from typing import Tuple, Dict, Union
import math
from risk_classifier import RiskClassifier


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

    def calculate_mews_score(self, heart_rate, breathing_rate, temperature = 36, avpu = "Alert", systolic_bp=120):
        """
        Calculate the Modified Early Warning Score (MEWS)

        Parameters:
        heart_rate (int): Patient's heart rate in beats per minute
        systolic_bp (int): Patient's systolic blood pressure (default 120 mmHg)
        temperature (float): Patient's temperature in Celsius
        avpu (str): Patient's alertness level ("Alert", "Verbal", "Pain", "Unresponsive")

        Returns:
        int: Total MEWS score
        """        
        # Heart rate scoring
        if heart_rate < 40:
            hr_score = 2
        elif 40 <= heart_rate <= 50:
            hr_score = 1
        elif 51 <= heart_rate <= 100:
            hr_score = 0
        elif 101 <= heart_rate <= 110:
            hr_score = 1
        elif 111 <= heart_rate <= 129:
            hr_score = 2
        else:
            hr_score = 3

        # Systolic BP scoring
        if systolic_bp <= 70:
            bp_score = 3
        elif 71 <= systolic_bp <= 80:
            bp_score = 2
        elif 81 <= systolic_bp <= 100:
            bp_score = 1
        elif 101 <= systolic_bp <= 199:
            bp_score = 0
        else:
            bp_score = 2

        # Temperature scoring
        if temperature < 35:
            temp_score = 2
        elif 35 <= temperature <= 38.4:
            temp_score = 0
        else:
            temp_score = 2

        # AVPU scoring
        avpu_scores = {
            "Alert": 0,
            "Verbal": 1,
            "Pain": 2,
            "Unresponsive": 3
        }
        avpu_score = avpu_scores.get(avpu, 0)

        # Breathing rate scoring
        if breathing_rate < 9:
            breath_score = 2
        elif 9 <= breathing_rate <= 14:
            breath_score = 0
        elif 15 <= breathing_rate <= 20:
            breath_score = 1
        elif 21 <= breathing_rate <= 29:
            breath_score = 2
        else:
            breath_score = 3

        # Total MEWS score
        total_score = hr_score + bp_score + temp_score + avpu_score + breath_score

        return total_score


    def calculate_ors(
        self,
        prodigy_score: int,
        mews_score: int,
        classifier
    ) -> str:
        """Calculate ORS with refined risk assessment."""

        weights = {
            'prodigy_moderate': 3,
            'mews_moderate': 8,
            'theta_moderate': -24,
            'prodigy_high': 5,
            'mews_high': 14,
            'theta_high': -70
        }
        
        # Moderate Calc
        ors_moderate = (
            weights['prodigy_moderate'] * prodigy_score +
            weights['mews_moderate'] * mews_score +
            weights['theta_moderate']
        )
        
        # High Calc
        ors_high = (
            weights['prodigy_high'] * prodigy_score +
            weights['mews_high'] * mews_score +
            weights['theta_high']
        )

        print(ors_moderate)
        print(ors_high)
        # Single prediction
        result = classifier.predict(mews_score, prodigy_score)
        print(f"Risk level: {result['risk_name']}")
        print(f"Probabilities: {result['probabilities']}")

        # return_str = ""
        # if ors_moderate < 0:
        #     return_str = "Not at Risk"
        # else:
        #     # ors_moderate > 0
        #     if ors_high < 0:
        #         return_str = "Moderate Risk"
        #     else: 
        #         return_str = "High Risk"

        return result['risk_name']

    def load_patient_data(self, file_path: str) -> Dict[str, Union[str, float, bool, int]]:
        """Load patient data from a JSON file."""
        with open(file_path, 'r') as file:
            return json.load(file)

    def test_patient(self, patient_data, classifier):
        prodigy_score = calc.calculate_prodigy_score(
            age=patient_data['age'],
            sex=patient_data['sex'],
            sdb=patient_data['sdb'],
            opioid_naive=patient_data['opioid_naive'],
            chf=patient_data['chf']
        )
        
        mews_score = calc.calculate_mews_score(
            heart_rate=patient_data['heart_rate'],
            breathing_rate=patient_data['current_breathing_rate']
        )

        risk_level = calc.calculate_ors(
            prodigy_score,
            mews_score, 
            classifier
        )
        
        print("\nRisk Assessment Results:")
        print("-" * 50)
        print(f"PRODIGY Risk Score: {prodigy_score}/39")
        print(f"MEWS Risk Score: {mews_score}/6") #based on only hr and br, change if want total
        print(f"Risk Level: {risk_level}")
        print("-" * 50)

if __name__ == "__main__":
    calc = CalcClass()
    classifier = RiskClassifier()

    test_cases = [
        "patient_files/critical_risk_patient.json",
        "patient_files/high_risk_patient.json",
        "patient_files/low_risk_patient.json",
        "patient_files/moderate_risk_patient.json"
    ]
    for path in test_cases:
        patient_data = calc.load_patient_data(path)
        print("----------------------------------------")
        print("Testing patient: " + path)
        print("----------------------------------------")
        calc.test_patient(patient_data, classifier)
    
    