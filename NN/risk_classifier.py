import tensorflow as tf
import numpy as np
import pickle

class RiskClassifier:
    def __init__(self, model_path="risk_model.h5", scaler_path="scaler.pkl"):
        self.model = tf.keras.models.load_model(model_path)
        with open(scaler_path, 'rb') as f:
            self.scaler = pickle.load(f)
        self.risk_names = ["Low", "Medium", "High"]
    
    def predict(self, mews, prodigy):
        input_data = np.array([[mews, prodigy]])
        input_scaled = self.scaler.transform(input_data)
        prediction = self.model.predict(input_scaled)[0]
        risk_level = np.argmax(prediction)
        
        return {
            'risk_level': risk_level,
            'risk_name': self.risk_names[risk_level],
            'probabilities': {self.risk_names[i]: float(prediction[i]) for i in range(len(prediction))}
        }
    
    def batch_predict(self, data):
        """
        Predict for multiple patients
        data: list of (mews, prodigy) tuples
        """
        input_data = np.array(data)
        input_scaled = self.scaler.transform(input_data)
        predictions = self.model.predict(input_scaled)
        
        results = []
        for i, pred in enumerate(predictions):
            risk_level = np.argmax(pred)
            results.append({
                'mews': data[i][0],
                'prodigy': data[i][1],
                'risk_level': risk_level,
                'risk_name': self.risk_names[risk_level],
                'probabilities': {self.risk_names[j]: float(pred[j]) for j in range(len(pred))}
            })
        
        return results