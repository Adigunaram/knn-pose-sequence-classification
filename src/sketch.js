let video;
// Create a KNN classifier
const knnClassifier = ml5.KNNClassifier();
let poseNet;
let poses = [];
let classificationResult = "";
let allowedToPredict = false;
let isAllowedPredict = true;

function timeout(time) {
  return new Promise((r) => {
    setTimeout(r, time);
  });
}

function setup() {
  const canvas = createCanvas(460, 380);
  canvas.parent("videoContainer");
  video = createCapture(VIDEO);
  video.size(width, height);

  // Inject HTML Button with JS
  createButtons();

  // Create a new poseNet method with a single detection
  poseNet = ml5.poseNet(video, modelReady);

  // This sets up an event that fills the global variable "poses"
  // with an array every time new poses are detected
  poseNet.on("pose", function (results) {
    poses = results;
  });

  // Hide the video element, and just show the canvas
  video.hide();
}

function modelReady() {
  select("#status").html("Model Loaded");
}

function draw() {
  image(video, 0, 0, width, height);
  drawKeypoints();
  drawSkeleton();
  fill(0, 255, 0);
  textSize(64);
}

// A function to draw ellipses over the detected keypoints
function drawKeypoints() {
  // Loop through all the poses detected
  for (let i = 0; i < poses.length; i++) {
    // For each pose detected, loop through all the keypoints
    let pose = poses[i].pose;
    for (let j = 0; j < pose.keypoints.length; j++) {
      // A keypoint is an object describing a body part (like rightArm or leftShoulder)
      let keypoint = pose.keypoints[j];
      // Only draw an ellipse is the pose probability is bigger than 0.2
      if (keypoint.score > 0.2) {
        fill(255, 255, 255);
        noStroke();
        ellipse(keypoint.position.x, keypoint.position.y, 10, 10);
      }
    }
  }
}

// A function to draw the skeletons
function drawSkeleton() {
  // Loop through all the skeletons detected
  for (let i = 0; i < poses.length; i++) {
    let skeleton = poses[i].skeleton;
    // For every skeleton, loop through all body connections
    for (let j = 0; j < skeleton.length; j++) {
      let partA = skeleton[j][0];
      let partB = skeleton[j][1];
      stroke(255, 0, 0);
      strokeWeight(4);
      line(
        partA.position.x,
        partA.position.y,
        partB.position.x,
        partB.position.y
      );
    }
  }
}

// Clear all the examples in all labels
function clearAllLabels() {
  knnClassifier.clearAllLabels();
  updateCounts();
}

// Classify
function classify() {
  // Get the total number of labels from knnClassifier
  const numLabels = knnClassifier.getNumLabels();
  if (numLabels <= 0) {
    console.error("There is no examples in any label");
    return;
  }

  // Convert poses results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
  const poseArray = poses[0].pose.keypoints.map((p) => [
    p.score,
    p.position.x,
    p.position.y,
  ]);
  // Use knnClassifier to classify which label do these features belong to
  // You can pass in a callback function `gotResults` to knnClassifier.classify function
  knnClassifier.classify(poseArray, gotResults);
  allowedToPredict = true;
}

// Show the results
async function gotResults(err, result) {
  // Display any error
  if (err) {
    console.error(err);
  }

  if (isAllowedPredict) {
    if (result.confidencesByLabel) {
      const confidences = result.confidencesByLabel;

      if (result.label) {
        classificationResult = result.label;
        console.log(classificationResult);
        isAllowedPredict = false;
      }
    }
  } else {
    console.log("Sleeping for 3 seconds");
    await timeout(3000);
    isAllowedPredict = true;
  }

  if (poses.length > 0) {
    classify();
  }
}

// Save dataset as myKNNDataset.json
function saveDataset() {
  knnClassifier.save("myKNN");
}
// Load dataset to the classifier
function loadDataset() {
  knnClassifier.load("knn-dataset.json", updateCounts);
}

// Add example
function addExample(label) {
  // Convert poses results to a 2d array [[score0, x0, y0],...,[score16, x16, y16]]
  const poseArray = poses[0].pose.keypoints.map((p) => [
    p.score,
    p.position.x,
    p.position.y,
  ]);
  // Add an example with a label to the classifier
  knnClassifier.addExample(poseArray, label);
  updateCounts();
}

function clearLabel(classLabel) {
  knnClassifier.clearLabel(classLabel);
  updateCounts();
}

function updateCounts() {
  const counts = knnClassifier.getCountByLabel();
  select("#exampleA").html(counts["A"] || 0);
  select("#exampleB").html(counts["B"] || 0);
  select("#exampleC").html(counts["C"] || 0);
  select("#exampleD").html(counts["D"] || 0);
  select("#exampleIdle").html(counts["Idle"] || 0);
}

function createButtons() {
  let btnClass = ["A", "B", "C", "D", "Idle"];

  for (let i = 0; i < btnClass.length; i++) {
    createBtn(btnClass[i]);
  }

  // Predict button
  buttonPredict = select("#btnPredict");
  buttonPredict.mousePressed(classify);

  // Clear all classes button
  buttonClearAll = select("#clearExample");
  buttonClearAll.mousePressed(clearAllLabels);

  // Load saved classifier dataset
  buttonSetData = select("#loadDataset");
  buttonSetData.mousePressed(loadDataset);

  // Get classifier dataset
  buttonGetData = select("#saveDataset");
  buttonGetData.mousePressed(saveDataset);
}

function createBtn(label) {
  const btnAdd = document.getElementById(`addClass${label}`);
  const btnReset = document.getElementById(`reset${label}`);

  btnAdd.addEventListener("click", () => {
    addExample(label);
  });

  btnReset.addEventListener("click", () => {
    clearLabel(label);
  });
}
