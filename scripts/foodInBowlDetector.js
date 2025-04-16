// Food Bowl Emptiness Detector using TensorFlow.js
// This script analyzes images of pet food bowls to determine if they're empty or not

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Configuration
const IMAGE_WIDTH = 224;
const IMAGE_HEIGHT = 224;
const MODEL_PATH = './food_bowl_model';

// Function to preprocess the image
async function preprocessImage(imagePath) {
    try {
        // Load the image
        const image = await loadImage(imagePath);

        // Create a canvas and draw the image
        const canvas = createCanvas(IMAGE_WIDTH, IMAGE_HEIGHT);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);

        // Get image data and normalize
        const imageData = ctx.getImageData(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT);
        const tensor = tf.browser.fromPixels(imageData)
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
async function createAndTrainModel() {
    console.log('Creating and training the model...');

    // Create a sequential model
    const model = tf.sequential();

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
    console.log(model.summary());

    // In a real application, you would train the model with actual data here
    // For this example, we'll save the untrained model
    await model.save(`file://${MODEL_PATH}`);
    console.log(`Model saved to ${MODEL_PATH}`);

    return model;
}

// Function to load the model or create a new one if it doesn't exist
async function loadOrCreateModel() {
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
async function detectFoodBowlStatus(imagePath) {
    try {
        // Load or create the model
        const model = await loadOrCreateModel();

        // Preprocess the image
        const tensor = await preprocessImage(imagePath);

        // Make prediction
        const prediction = await model.predict(tensor).data();
        const isEmpty = prediction[0] < 0.5;

        console.log(`Prediction value: ${prediction[0]}`);
        console.log(`The food bowl is ${isEmpty ? 'empty' : 'not empty'}`);

        // Clean up
        tensor.dispose();

        return {
            isEmpty,
            confidence: isEmpty ? 1 - prediction[0] : prediction[0]
        };
    } catch (error) {
        console.error('Error detecting food bowl status:', error);
        throw error;
    }
}

// Example usage
async function main() {
    // Replace with the path to your image
    const imagePath = process.argv[2] || './sample_food_bowl.jpg';

    if (!fs.existsSync(imagePath)) {
        console.error(`Image not found at path: ${imagePath}`);
        console.log('Usage: node food_bowl_detector.js [path_to_image]');
        return;
    }

    console.log(`Analyzing image: ${imagePath}`);

    try {
        const result = await detectFoodBowlStatus(imagePath);
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

module.exports = {
    detectFoodBowlStatus
};