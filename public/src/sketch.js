let video;
// Create a KNN classifier
const knnClassifier = ml5.KNNClassifier();
let poseNet;
let poses = [];
let classificationResult = "";
let previousClassification = "";
let isAllowedPredict = true;

let sequenceOne = [];
let sequenceTwo = [];
let sequenceThree = [];
let sequenceFour = [];

let doSequence = [];

var TIMEOUT = 200;

let baseUrl = "http://localhost:8080/receive";

let isTrainingClass = {
  classA: {
    isTraining: false,
  },
  classB: {
    isTraining: false,
  },
  classC: {
    isTraining: false,
  },
  classD: {
    isTraining: false,
  },
  classIdle: {
    isTraining: false,
  },
};

client = new Paho.MQTT.Client(
  "vm.visinnovation.id",
  8083,
  "web_" + parseInt(Math.random() * 100, 10)
);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

let = options = {
  useSSL: false,
  userName: "",
  password: "",
  onSuccess: onConnect,
  onFailure: onFailure,
};

client.connect(options);

function onConnect() {
  // Once a connection has been made, make a subscription and send a message.
  console.log("onConnect");
  client.subscribe("esp/test");
  message = new Paho.MQTT.Message(" Hello CloudMQTT");
  message.destinationName = "esp/test";
  client.send(message);
}

function onFailure(e) {
  console.log(e);
}

function onConnectionLost(respObject) {
  if (respObject.errorCode !== 0) {
    console.log("onConnectionLost: " + respObject.errorMessage);
  }
}

function onMessageArrived(msg) {
  console.log("onMessageArrived" + msg.payloadString);
}

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

  if (classificationResult == "A") {
    text("A", width / 2, height / 2);
  } else if (classificationResult == "B") {
    text("B", width / 2, height / 2);
  } else if (classificationResult == "C") {
    text("C", width / 2, height / 2);
  } else if (classificationResult == "D") {
    text("D", width / 2, height / 2);
  } else if (classificationResult == "Idle") {
    text("", width / 2, height / 2);
  }
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
}

// Show the results
async function gotResults(err, result) {
  // Display any error
  if (err) {
    console.error(err);
  }

  if (result.label) {
    classificationResult = result.label;

    if (isAllowedPredict) {
      if (result.confidencesByLabel) {
        const confidences = result.confidencesByLabel;

        previousClassification = classificationResult;

        await appendSequence(classificationResult);

        isAllowedPredict = false;

        select("#confidenceA").html(
          `${confidences["A"] ? confidences["A"] * 100 : 0}`
        );
        select("#confidenceB").html(
          `${confidences["B"] ? confidences["B"] * 100 : 0}`
        );
        select("#confidenceC").html(
          `${confidences["C"] ? confidences["C"] * 100 : 0}`
        );
        select("#confidenceD").html(
          `${confidences["D"] ? confidences["D"] * 100 : 0}`
        );
        select("#confidenceIdle").html(
          `${confidences["Idle"] ? confidences["Idle"] * 100 : 0}`
        );
      }
    } else {
      // console.log("Sleeping for 0.1 seconds");
      await timeout(100);
      if (previousClassification != classificationResult) {
        isAllowedPredict = true;
      } else {
        isAllowedPredict = false;
      }
    }
  }

  if (poses.length > 0) {
    classify();
  }
}

async function appendSequence(pose) {
  append(doSequence, pose);
  if (doSequence.length == 2) {
    console.log("2 pose, checking sequence");
    let isSequenceOne = compareSequence(doSequence, sequenceOne);
    let isSequenceTwo = compareSequence(doSequence, sequenceTwo);
    let isSequenceThree = compareSequence(doSequence, sequenceThree);
    let isSequenceFour = compareSequence(doSequence, sequenceFour);
    doSequence = [];
    isAllowedPredict = true;

    if (isSequenceOne) {
      message = new Paho.MQTT.Message("1");
      message.destinationName = "cliot/12345/saklar1";
      client.send(message);

      message = new Paho.MQTT.Message("0");
      message.destinationName = "cliot/12345/saklar2";
      client.send(message);
      console.log("Sequence One");
    }

    if (isSequenceTwo) {
      message = new Paho.MQTT.Message("0");
      message.destinationName = "cliot/12345/saklar1";
      client.send(message);

      message = new Paho.MQTT.Message("1");
      message.destinationName = "cliot/12345/saklar2";
      client.send(message);
      console.log("Sequence Two");
    }

    if (isSequenceThree) {
      message = new Paho.MQTT.Message("1");
      message.destinationName = "cliot/12345/saklar1";
      client.send(message);

      message = new Paho.MQTT.Message("1");
      message.destinationName = "cliot/12345/saklar2";
      client.send(message);
      console.log("Sequence Three");
    }

    if (isSequenceFour) {
      message = new Paho.MQTT.Message("0");
      message.destinationName = "cliot/12345/saklar1";
      client.send(message);

      message = new Paho.MQTT.Message("0");
      message.destinationName = "cliot/12345/saklar2";
      client.send(message);
      console.log("Sequence Four");
    }

    /** publish to mqtt */
    // await fetch("/publish", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({
    //     isSequenceOne,
    //     isSequenceTwo,
    //     isSequenceThree,
    //     isSequenceFour,
    //   }),
    // });
  }
}

function compareSequence(a, b) {
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((val, index) => val === b[index])
  );
}

// Save dataset as myKNNDataset.json
function saveDataset() {
  knnClassifier.save("myKNN");
}
// Load dataset to the classifier
function loadDataset() {
  knnClassifier.load("./myKNN_kosan.json", updateCounts);
}

// Add example
async function addExample(label) {
  // Save Image
  await captureCanvas();

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

  buttonAddPoseToSequence = select("#btnAddPoseToSequence");
  buttonAddPoseToSequence.mousePressed(addPoseToSequence);
}

function isTraining(label, condition) {
  switch (label) {
    case "A":
      isTrainingClass.classA.isTraining = condition;
      logTrainingText();
      loopTraining(label);
      break;

    case "B":
      isTrainingClass.classB.isTraining = condition;
      logTrainingText();
      loopTraining(label);
      break;

    case "C":
      isTrainingClass.classC.isTraining = condition;
      logTrainingText();
      loopTraining(label);
      break;

    case "D":
      isTrainingClass.classD.isTraining = condition;
      logTrainingText();
      loopTraining(label);
      break;

    case "Idle":
      isTrainingClass.classIdle.isTraining = condition;
      logTrainingText();
      loopTraining(label);
      break;
  }
}

function logTrainingText() {
  console.log(isTrainingClass);
}

async function loopTraining(label) {
  console.log(`Training ${label}`);
  switch (label) {
    case "A":
      while (isTrainingClass.classA.isTraining) {
        await addExample(label);
        await timeout(TIMEOUT);
      }
    case "B":
      while (isTrainingClass.classB.isTraining) {
        await addExample(label);
        await timeout(TIMEOUT);
      }
    case "C":
      while (isTrainingClass.classC.isTraining) {
        await addExample(label);
        await timeout(TIMEOUT);
      }
    case "D":
      while (isTrainingClass.classD.isTraining) {
        await addExample(label);
        await timeout(TIMEOUT);
      }
    case "Idle":
      while (isTrainingClass.classIdle.isTraining) {
        await addExample(label);
        await timeout(TIMEOUT);
      }
  }
}

function addPoseToSequence() {
  const pose = select("#selectPose");
  const sequence = select("#selectSequence");
  addToListSequence(pose.value(), sequence.value());
}

function addToListSequence(pose, sequence) {
  if (sequence == "sequenceOne") {
    append(sequenceOne, pose);
    updateSequenceHTML(sequence, sequenceOne);
  } else if (sequence == "sequenceTwo") {
    append(sequenceTwo, pose);
    updateSequenceHTML(sequence, sequenceTwo);
  } else if (sequence == "sequenceThree") {
    append(sequenceThree, pose);
    updateSequenceHTML(sequence, sequenceThree);
  } else if (sequence == "sequenceFour") {
    append(sequenceFour, pose);
    updateSequenceHTML(sequence, sequenceFour);
  }
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function updateSequenceHTML(sequence, array) {
  let capitalSequence = capitalizeFirstLetter(sequence);
  let liText = select(`#list${capitalSequence}`);
  liText.html(array);
}

function createBtn(label) {
  const btnStart = document.getElementById(`startClass${label}`);
  const btnStop = document.getElementById(`stopClass${label}`);
  const btnReset = document.getElementById(`reset${label}`);

  btnStop.disabled = true;

  btnStart.addEventListener("click", () => {
    console.log(label);
    btnStart.disabled = true;
    btnStop.disabled = false;
    isTraining(label, true);
  });

  btnStop.addEventListener("click", () => {
    btnStart.disabled = false;
    btnStop.disabled = true;
    isTraining(label, false);
  });

  btnReset.addEventListener("click", () => {
    let postData = { id: 1, name: "Sam", email: "sam@samcorp.com" };

    httpPost(baseUrl, "json", postData, function (response) {
      console.log(response);
    });
    // clearLabel(label);
  });
}

async function captureCanvas(filename = "train_canvas.png") {
  var canvas = document.getElementById("defaultCanvas0");
  var base64 = canvas.toDataURL();

  await fetch(base64)
    .then((res) => res.blob())
    .then((blob) => {
      const formData = new FormData();
      const file = new File([blob], filename);
      formData.append("canvas", file);

      return fetch("/upload", {
        method: "POST",
        body: formData,
      });
    });
}
