import tensorflowjs as tfjs
from risk_classifier import RiskClassifier

# Load your trained model
classifier = RiskClassifier()

# Convert the model to TensorFlow.js format
tfjs.converters.save_keras_model(classifier.model, 'public/models/risk_model')

# Also save the scaler parameters as JSON
import json

# Create a JSON-serializable representation of the scaler
scaler_params = {
    'mean': classifier.scaler.mean_.tolist(),
    'scale': classifier.scaler.scale_.tolist()
}

with open('public/models/scaler.json', 'w') as f:
    json.dump(scaler_params, f)
