import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import confusion_matrix, classification_report
from matplotlib.colors import LinearSegmentedColormap

# Define constants
NUM_CLASSES = 3
EPOCHS = 100
BATCH_SIZE = 32

def create_model(num_hidden_units=8, num_hidden_layers=1):
    """Create a neural network model for risk classification"""
    model = Sequential()
    
    # Input layer
    model.add(Dense(num_hidden_units, activation='relu', input_shape=(2,)))
    
    # Additional hidden layers if specified
    for _ in range(num_hidden_layers - 1):
        model.add(Dense(num_hidden_units, activation='relu'))
    
    # Output layer (3 classes: low, medium, high)
    model.add(Dense(NUM_CLASSES, activation='softmax'))
    
    # Compile model
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def generate_synthetic_data(n_samples=10000):
    """
    Generate synthetic training data based on the given ranges:
    MEWS: 0-2 (low), 3-5 (medium), 6+ (high)
    PRODIGY: 0-7 (low), 8-13 (medium), 14+ (high)
    """
    np.random.seed(42)
    
    # Generate random MEWS and PRODIGY scores
    mews = np.random.randint(0, 6, n_samples)
    prodigy = np.random.randint(0, 39, n_samples)
    
    # Initialize labels
    labels = np.zeros(n_samples, dtype=int)
    
    # Simple rule-based classification for synthetic data
    for i in range(n_samples):
        # Determine MEWS risk
        # Determine MEWS risk
        if mews[i] <= 1:
            mews_risk = 0  # low
        elif mews[i] <= 3:
            mews_risk = 1  # medium
        else:
            mews_risk = 2  # high

        # Determine PRODIGY risk with corrected thresholds
        if prodigy[i] <= 10:
            prodigy_risk = 0  # low
        elif prodigy[i] <= 25:
            prodigy_risk = 1  # medium
        else:
            prodigy_risk = 2  # high

        # Combined risk (taking the higher risk level)
        labels[i] = max(mews_risk, prodigy_risk)

        # Introduce some nuanced adjustments for more complex boundaries
        if mews_risk == 1 and prodigy_risk == 1:
            if np.random.random() < 0.3:  # 30% chance of bumping up to high risk
                labels[i] = 2

        # Additional condition to shape the decision boundary curves
        if mews[i] < 3:
            if np.random.random() * float(prodigy[i])/39 < 0.9:  # 30% chance of bumping up to high risk
                labels[i] = 0
            else:
                labels[i]  = 1
        if mews[i] == 3 and prodigy[i] > 20:
            labels[i] = 2
        if mews[i] == 2 and prodigy[i] > 30:
            labels[i] = 2
        if mews[i] == 4 and prodigy[i] < 15:
            labels[i] = 1
        
    return np.column_stack((mews, prodigy)), labels

def plot_decision_boundary(model, scaler):
    """Plot the decision boundary of the model with improved styling"""
    # Create mesh grid
    h = 0.01  # step size
    x_min, x_max = 0, 6
    y_min, y_max = 0, 39
    xx, yy = np.meshgrid(np.arange(x_min, x_max, h),
                         np.arange(y_min, y_max, h))
    
    # Get predictions for all grid points
    mesh_points = np.c_[xx.ravel(), yy.ravel()]
    mesh_points_scaled = scaler.transform(mesh_points)
    Z = model.predict(mesh_points_scaled)
    Z = np.argmax(Z, axis=1)
    Z = Z.reshape(xx.shape)
    
    # Create a custom colormap for risk levels (green -> yellow -> red)
    colors = [(0.196, 0.7098, 0.0078),    # dark green for low risk
              (0.988, 0.753, 0.247),   # yellow for medium risk
              (0.7098, 0.0431, 0.0078)]    # red for high risk
    custom_cmap = LinearSegmentedColormap.from_list('risk_cmap', colors, N=3)
    
    # Set up the plot with a light background
    plt.figure(figsize=(10, 8), facecolor='none')
    ax = plt.subplot(111)
    ax.patch.set_alpha(0)  # Make subplot background transparent
    
    # Plot the decision boundary with the custom colormap
    contour = plt.contourf(xx, yy, Z, alpha=0.9, cmap=custom_cmap, levels=np.arange(4)-0.5)
    
    # Improve grid styling
    plt.grid(True, linestyle='--', alpha=0.3, color='gray')
    
    # Add labels and title with improved styling
    plt.xlabel('MEWS Score', fontsize=12, fontweight='bold')
    plt.ylabel('PRODIGY Score', fontsize=12, fontweight='bold')
    plt.title('Risk Classification Decision Boundary', fontsize=16, fontweight='bold')
    
    # Add the reference boundaries with improved styling
    plt.axvline(x=2.5, linestyle='--', color='white', alpha=0.8, linewidth=1.5)
    plt.axvline(x=5.0, linestyle='--', color='white', alpha=0.8, linewidth=1.5)
    plt.axhline(y=7.5, linestyle='--', color='white', alpha=0.8, linewidth=1.5)
    plt.axhline(y=13.5, linestyle='--', color='white', alpha=0.8, linewidth=1.5)
    
    # Improve axes styling
    plt.xlim(x_min, x_max)
    plt.ylim(y_min, y_max)
    ax.tick_params(colors='#333333', grid_alpha=0.3)
    
    # Add a legend with color swatches
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor=colors[0], label='Low Risk'),
        Patch(facecolor=colors[1], label='Medium Risk'),
        Patch(facecolor=colors[2], label='High Risk')
    ]
    plt.legend(handles=legend_elements, loc='upper right', framealpha=0.9)
    
    # Add a colorbar with improved styling
    cbar = plt.colorbar(contour, ticks=[0, 1, 2])
    cbar.set_label('Risk Class', fontsize=10, fontweight='bold')
    cbar.set_ticklabels(['Low', 'Medium', 'High'])
    
    # Add a subtle border around the plot
    for spine in ax.spines.values():
        spine.set_edgecolor('#dddddd')
        
    plt.tight_layout()
    plt.savefig('risk_decision_boundary.png', dpi=300, bbox_inches='tight')
    plt.show()

def train_and_evaluate_model():
    """Train and evaluate a neural network model"""
    # Generate synthetic data
    X, y = generate_synthetic_data(10000)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Normalize features
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Create a model with 1 hidden layer of 8 units
    model = create_model(num_hidden_units=8, num_hidden_layers=1)
    
    # Train the model
    history = model.fit(
        X_train_scaled, y_train,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        validation_split=0.2,
        verbose=1
    )
    
    # Evaluate on test set
    test_loss, test_accuracy = model.evaluate(X_test_scaled, y_test, verbose=0)
    print(f"Test accuracy: {test_accuracy:.4f}")
    
    # Plot training history
    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'])
    plt.plot(history.history['val_accuracy'])
    plt.title('Model Accuracy')
    plt.ylabel('Accuracy')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='lower right')
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'])
    plt.plot(history.history['val_loss'])
    plt.title('Model Loss')
    plt.ylabel('Loss')
    plt.xlabel('Epoch')
    plt.legend(['Train', 'Validation'], loc='upper right')
    plt.tight_layout()
    plt.savefig('training_history.png')
    plt.show()
    
    # Make predictions on test data
    y_pred = np.argmax(model.predict(X_test_scaled), axis=1)
    
    # Calculate confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    print("Confusion Matrix:")
    print(cm)
    
    # Print classification report
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['Low', 'Medium', 'High']))
    
    # Plot decision boundary - Fixed: directly pass model and scaler instead of lambda
    plot_decision_boundary(model, scaler, X_train, y_train)
    
    return model, scaler

def predict_risk(model, scaler, mews, prodigy):
    """Predict risk level for a new patient"""
    input_data = np.array([[mews, prodigy]])
    input_scaled = scaler.transform(input_data)
    prediction = model.predict(input_scaled)[0]
    risk_level = np.argmax(prediction)
    
    risk_names = ["Low", "Medium", "High"]
    probabilities = {risk_names[i]: float(prediction[i]) for i in range(len(prediction))}
    
    print(f"MEWS: {mews}, PRODIGY: {prodigy}")
    print(f"Predicted risk level: {risk_names[risk_level]}")
    print(f"Risk probabilities: {probabilities}")
    
    return risk_level, probabilities

def save_model(model, scaler, model_path="risk_model.h5", scaler_path="scaler.pkl"):
    """Save the model and scaler for future use"""
    import pickle
    
    model.save(model_path)
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    
    print(f"Model saved to {model_path}")
    print(f"Scaler saved to {scaler_path}")

def load_model(model_path="risk_model.h5", scaler_path="scaler.pkl"):
    """Load the saved model and scaler"""
    import pickle
    from tensorflow.keras.models import load_model
    
    model = load_model(model_path)
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
    
    return model, scaler

def experiment_with_architectures():
    """Try different neural network architectures"""
    X, y = generate_synthetic_data(2000)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    scaler = MinMaxScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    architectures = [
        (4, 1),     # 4 units, 1 layer
        (8, 1),     # 8 units, 1 layer
        (16, 1),    # 16 units, 1 layer
        (8, 2),     # 8 units, 2 layers
        (8, 3),     # 8 units, 3 layers
    ]
    
    results = []
    
    for units, layers in architectures:
        print(f"\nTraining model with {units} units and {layers} layers")
        model = create_model(num_hidden_units=units, num_hidden_layers=layers)
        
        # Train
        history = model.fit(
            X_train_scaled, y_train,
            epochs=EPOCHS,
            batch_size=BATCH_SIZE,
            validation_split=0.2,
            verbose=0
        )
        
        # Evaluate
        test_loss, test_accuracy = model.evaluate(X_test_scaled, y_test, verbose=0)
        results.append((units, layers, test_accuracy))
        print(f"Test accuracy: {test_accuracy:.4f}")
    
    # Print summary of results
    print("\nArchitecture Comparison:")
    print("Units | Layers | Accuracy")
    print("-----------------------")
    for units, layers, acc in results:
        print(f"{units:5d} | {layers:6d} | {acc:.4f}")

# MAIN EXECUTION
print("Risk Classification Neural Network")
print("Training the model...")
# model, scaler = train_and_evaluate_model()

# Test with some example cases
# test_cases = [
#     (1, 5),    # Low MEWS, Low PRODIGY
#     (4, 10),   # Medium MEWS, Medium PRODIGY
#     (7, 15),   # High MEWS, High PRODIGY
#     (2, 12),   # Low MEWS, Medium PRODIGY
#     (6, 6),    # High MEWS, Low PRODIGY
# ]

# print("\nTest Cases:")
# for mews, prodigy in test_cases:
#     predict_risk(model, scaler, mews, prodigy)
    # print()

# Save the model for future use
# save_model(model, scaler)

# Uncomment the following line if you want to experiment with different architectures
# experiment_with_architectures()

model, scaler = load_model()
plot_decision_boundary(model, scaler)