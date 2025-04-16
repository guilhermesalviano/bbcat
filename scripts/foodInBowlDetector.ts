// Food Bowl Emptiness Detector using TensorFlow.js
// This script analyzes images of pet food bowls to determine if they're empty or not

import * as tf from '@tensorflow/tfjs-node';
import * as fs from 'fs';
import { createCanvas, loadImage, Canvas, Image, CanvasRenderingContext2D, ImageData as CanvasImageData } from 'canvas';

// Configuration
const IMAGE_WIDTH: number = 224;
const IMAGE_HEIGHT: number = 224;
const MODEL_PATH: string = './food_bowl_model';

// Interfaces
interface BowlDetectionResult {
  isEmpty: boolean;
  confidence: number;
}

// Function to preprocess the image
async function preprocessImage(imagePath: string): Promise<tf.Tensor> {
  try {
    // Load the image
    const image: Image = await loadImage(imagePath);

    // Create a canvas and draw the image
    const canvas: Canvas = createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

    // Convert to tensor directly from canvas instead of using ImageData
    // This avoids the incompatibility between node-canvas ImageData and browser ImageData
    const tensor = tf.browser.fromPixels(canvas as unknown as HTMLCanvasElement)
      .resizeNearestNeighbor([IMAGE_WIDTH, IMAGE_HEIGHT])
      .toFloat()
      .div(tf.scalar(255.0))
      .expandDims();

    return tensor;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw error;
  }
}

// Simple model for food bowl detection
async function createAndTrainModel(): Promise<tf.LayersModel> {
  console.log('Creating and training the model...');

  // Create a sequential model
  const model: tf.Sequential = tf.sequential();

  // Add layers
  model.add(tf.layers.conv2d({
    inputShape: [IMAGE_HEIGHT, IMAGE_WIDTH, 3],
    filters: 16,
    kernelSize: 3,
    activation: 'relu'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

  model.add(tf.layers.conv2d({
    filters: 32,
    kernelSize: 3,
    activation: 'relu'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

  model.add(tf.layers.conv2d({
    filters: 64,
    kernelSize: 3,
    activation: 'relu'
  }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 128, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.5 }));
  model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));

  // Compile the model
  model.compile({
    optimizer: 'adam',
    loss: 'binaryCrossentropy',
    metrics: ['accuracy']
  });

  console.log('Model created!');
  model.summary();

  // In a real application, you would train the model with actual data here
  // For this example, we'll save the untrained model
  await model.save(`file://${MODEL_PATH}`);
  console.log(`Model saved to ${MODEL_PATH}`);

  return model;
}

// Function to load the model or create a new one if it doesn't exist
async function loadOrCreateModel(): Promise<tf.LayersModel> {
  try {
    if (fs.existsSync(MODEL_PATH)) {
      console.log(`Loading existing model from ${MODEL_PATH}`);
      return await tf.loadLayersModel(`file://${MODEL_PATH}/model.json`);
    } else {
      console.log('No existing model found. Creating a new one.');
      return await createAndTrainModel();
    }
  } catch (error) {
    console.error('Error loading or creating model:', error);
    return await createAndTrainModel();
  }
}

// Main function to detect if a food bowl is empty
async function detectFoodBowlStatus(imagePath: string): Promise<BowlDetectionResult> {
  try {
    // Load or create the model
    const model: tf.LayersModel = await loadOrCreateModel();

    // Preprocess the image
    const tensor: tf.Tensor = await preprocessImage(imagePath);

    // Make prediction
    const prediction = await model.predict(tensor) as tf.Tensor;
    const predictionData = await prediction.data();
    const isEmpty: boolean = predictionData[0] < 0.5;

    console.log(`Prediction value: ${predictionData[0]}`);
    console.log(`The food bowl is ${isEmpty ? 'empty' : 'not empty'}`);

    // Clean up
    tensor.dispose();
    prediction.dispose();

    return {
      isEmpty,
      confidence: isEmpty ? 1 - predictionData[0] : predictionData[0]
    };
  } catch (error) {
    console.error('Error detecting food bowl status:', error);
    throw error;
  }
}

// Example usage
async function main(): Promise<void> {
  // Replace with the path to your image
  const imagePath: string = process.argv[2] || './sample_food_bowl.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error(`Image not found at path: ${imagePath}`);
    console.log('Usage: ts-node food_bowl_detector.ts [path_to_image]');
    return;
  }

  console.log(`Analyzing image: ${imagePath}`);

  try {
    const result: BowlDetectionResult = await detectFoodBowlStatus(imagePath);
    console.log('\nResults:');
    console.log(`Status: ${result.isEmpty ? 'EMPTY' : 'NOT EMPTY'}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(2)}%`);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export {
  detectFoodBowlStatus,
  BowlDetectionResult
};