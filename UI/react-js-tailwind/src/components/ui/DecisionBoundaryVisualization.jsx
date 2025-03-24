import React, { useEffect, useRef } from 'react';

const DecisionBoundaryVisualization = ({ mewsScore, prodigyScore }) => {
  const canvasRef = useRef(null);
  
  // Updated boundary equations based on the new image
  const boundaries = {
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
  const getRiskLevel = (mews, prodigy) => {
    // Check for medium risk islands first
    if (boundaries.isInMediumIsland(mews, prodigy)) {
      return 'medium';
    }
    
    // Main boundaries
    if (mews <= 2) {
      // For MEWS <= 2, use the low-medium boundary
      if (prodigy <= boundaries.lowMediumBoundary(mews)) {
        return 'low';
      } else {
        return 'high'; // There's very little medium in this region
      }
    } else {
      // For MEWS > 2
      if (prodigy <= 3) { // The small low region that extends
        return 'low';
      } else if (prodigy <= boundaries.mediumHighBoundary(mews)) {
        return 'medium';
      } else {
        return 'high';
      }
    }
  };
  
  // Draw the decision boundary using the equations
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Constants for mapping coordinates
    const mewsMax = 6;
    const prodigyMax = 39;
    
    // Function to convert MEWS, PRODIGY to canvas coordinates
    const toCanvasX = (mews) => (mews / mewsMax) * width;
    const toCanvasY = (prodigy) => height - (prodigy / prodigyMax) * height;
    
    // Modern UI colors for risk zones
    const riskColors = {
      low: 'rgba(111, 76, 158, 0.85)',    // More vibrant purple
      medium: 'rgba(0, 161, 156, 0.85)',  // More vibrant teal
      high: 'rgba(253, 204, 71, 0.85)'    // More vibrant yellow
    };
    
    // Draw smooth gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f3f4f6'); // Light gray
    gradient.addColorStop(1, '#e5e7eb'); // Slightly darker gray
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Pixel-based rendering with a reasonable resolution
    const step = 2; // Pixels per step (smaller = higher resolution but slower)
    
    for (let pixelX = 0; pixelX < width; pixelX += step) {
      for (let pixelY = 0; pixelY < height; pixelY += step) {
        // Convert canvas coordinates to MEWS/PRODIGY values
        const mews = (pixelX / width) * mewsMax;
        const prodigy = ((height - pixelY) / height) * prodigyMax;
        
        // Get risk level for this point
        const riskLevel = getRiskLevel(mews, prodigy);
        
        // Fill the pixel with the appropriate color
        ctx.fillStyle = riskColors[riskLevel];
        ctx.fillRect(pixelX, pixelY, step, step);
      }
    }
    
    // Draw grid with modern styling
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 0.5;
    
    // Vertical grid lines (MEWS)
    for (let x = 0; x <= mewsMax; x++) {
      const xPos = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, height);
      ctx.stroke();
      
      // Add x-axis labels with better styling
      if (x % 1 === 0) { // Only show integer labels
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(x.toString(), xPos, height - 5);
      }
    }
    
    // Horizontal grid lines (PRODIGY)
    for (let y = 0; y <= prodigyMax; y += 10) { // Only show every 10 units
      const yPos = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(width, yPos);
      ctx.stroke();
      
      // Add y-axis labels
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.font = '10px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(y.toString(), 15, yPos + 4);
    }
    
    // Draw axes labels with improved styling
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = '12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEWS Score', width / 2, height - 15);
    
    ctx.save();
    ctx.translate(16, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('PRODIGY Score', 0, 0);
    ctx.restore();
    
    // Add subtle risk labels that blend with the UI
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    
    // Low risk label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('Low Risk', width * 0.2, height * 0.2);
    
    // Medium risk label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('Medium Risk', width * 0.5, height * 0.5);
    
    // High risk label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'center';
    ctx.fillText('High Risk', width * 0.75, height * 0.25);
    
    // Draw boundary lines with elegant styling
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    
    // Draw low-medium boundary
    ctx.beginPath();
    ctx.moveTo(toCanvasX(1.2), toCanvasY(boundaries.lowMediumBoundary(1.2)));
    for (let mews = 1.25; mews <= 2; mews += 0.05) {
      ctx.lineTo(toCanvasX(mews), toCanvasY(boundaries.lowMediumBoundary(mews)));
    }
    ctx.stroke();
    
    // Draw the small low region extension
    ctx.beginPath();
    ctx.moveTo(toCanvasX(2), toCanvasY(3));
    ctx.lineTo(toCanvasX(6), toCanvasY(3));
    ctx.stroke();
    
    // Draw medium-high boundary
    ctx.beginPath();
    ctx.moveTo(toCanvasX(2), toCanvasY(boundaries.mediumHighBoundary(2)));
    for (let mews = 2.05; mews <= 5; mews += 0.05) {
      ctx.lineTo(toCanvasX(mews), toCanvasY(boundaries.mediumHighBoundary(mews)));
    }
    ctx.stroke();
    
    // Draw medium islands outlines
    const drawIsland = (startMews, endMews, stepSize = 0.05) => {
      let started = false;
      let lastY = 0;
      
      // Top curve
      ctx.beginPath();
      for (let mews = startMews; mews <= endMews; mews += stepSize) {
        // Calculate the center and height of the island at this MEWS value
        let centerY, height;
        
        if (mews >= 2.7 && mews <= 3.3) {
          centerY = 7 + (mews - 3) * 8;
          height = 10 - Math.abs(mews - 3) * 5;
        } else if (mews >= 3.7 && mews <= 4.3) {
          centerY = 11 - (mews - 4) * 2;
          height = 8 - Math.abs(mews - 4) * 4;
        } else if (mews >= 4.7 && mews <= 5.3) {
          centerY = 5 - (mews - 5) * 2;
          height = 6 - Math.abs(mews - 5) * 3;
        } else {
          continue;
        }
        
        const topY = centerY + height/2;
        
        if (!started) {
          ctx.moveTo(toCanvasX(mews), toCanvasY(topY));
          started = true;
        } else {
          ctx.lineTo(toCanvasX(mews), toCanvasY(topY));
        }
        
        lastY = topY;
      }
      
      // Bottom curve (go backwards)
      for (let mews = endMews; mews >= startMews; mews -= stepSize) {
        // Calculate the center and height of the island at this MEWS value
        let centerY, height;
        
        if (mews >= 2.7 && mews <= 3.3) {
          centerY = 7 + (mews - 3) * 8;
          height = 10 - Math.abs(mews - 3) * 5;
        } else if (mews >= 3.7 && mews <= 4.3) {
          centerY = 11 - (mews - 4) * 2;
          height = 8 - Math.abs(mews - 4) * 4;
        } else if (mews >= 4.7 && mews <= 5.3) {
          centerY = 5 - (mews - 5) * 2;
          height = 6 - Math.abs(mews - 5) * 3;
        } else {
          continue;
        }
        
        const bottomY = centerY - height/2;
        ctx.lineTo(toCanvasX(mews), toCanvasY(bottomY));
      }
      
      ctx.closePath();
      ctx.stroke();
    };
    
    // Draw all islands
    drawIsland(2.7, 5.3);
    
    // Ensure values are within bounds
    const boundedMews = Math.min(Math.max(0, mewsScore), mewsMax);
    const boundedProdigy = Math.min(Math.max(0, prodigyScore), prodigyMax);
    
    // Convert to canvas coordinates
    const x = toCanvasX(boundedMews);
    const y = toCanvasY(boundedProdigy);
    
    // Get the current risk level
    const currentRiskLevel = getRiskLevel(boundedMews, boundedProdigy);
    
    // Draw patient point with elegant styling
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.fill();
    
    // Modern shadow effect
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    
    // Stroke color based on risk level - using softer colors
    if (currentRiskLevel === 'high') {
      ctx.strokeStyle = '#FF3B30';  // Red for high risk
    } else if (currentRiskLevel === 'medium') {
      ctx.strokeStyle = '#FF9500';  // Orange for medium risk
    } else {
      ctx.strokeStyle = '#34C759';  // Green for low risk
    }
    
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    
    // Add point label with modern styling
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MEWS: ${boundedMews.toFixed(1)}`, x, y - 18);
    ctx.fillText(`PRODIGY: ${boundedProdigy.toFixed(1)}`, x, y + 24);
    
  }, [mewsScore, prodigyScore]);
  
  return (
    <div className="relative rounded-lg overflow-hidden shadow-md">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={300} 
        className="w-full h-full"
      />
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 backdrop-blur-sm text-white text-xs p-1.5 rounded">
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
          <span className="text-xs font-medium">Low Risk</span>
        </div>
        <div className="flex items-center gap-1 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
          <span className="text-xs font-medium">Medium Risk</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
          <span className="text-xs font-medium">High Risk</span>
        </div>
      </div>
    </div>
  );
};

export default DecisionBoundaryVisualization;