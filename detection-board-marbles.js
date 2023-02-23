// Load the image from a file or camera
let img = cv.imread('canvasInput');

// Convert to grayscale to make contour detection easier
cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);

// Apply a threshold to convert the image to a binary image
let thresholded = new cv.Mat();
cv.threshold(img, thresholded, 100, 255, cv.THRESH_BINARY);

// Pixel coordinates of the center of each position
let pixelCoords = [
  [240, 460], [280, 460], [320, 460], [360, 460], [400, 460],
  [210, 420], [250, 420], [290, 420], [330, 420], [370, 420], [410, 420],
  [180, 380], [220, 380], [260, 380], [300, 380], [340, 380], [380, 380], [420, 380],
  [150, 340], [190, 340], [230, 340], [270, 340], [310, 340], [350, 340], [390, 340],
  [120, 300], [160, 300], [200, 300], [240, 300], [280, 300], [320, 300], [360, 300],
  [90, 260], [130, 260], [170, 260], [210, 260], [250, 260], [290, 260],
  [100, 220], [140, 220], [180, 220], [220, 220], [260, 220],
  [110, 180], [150, 180], [190, 180], [230, 180],
  [120, 140], [160, 140], [200, 140], [240, 140]
];

// Map pixel coordinates to positions
let positionMap = [
  ['i5', 'i6', 'i7', 'i8', 'i9'],
  ['h4', 'h5', 'h6', 'h7', 'h8', 'h9'],
  ['g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9'],
  ['f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9'],
  ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'],
  ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'],
  ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'],
  ['b1', 'b2', 'b3', 'b4', 'b5', 'b6'],
  ['a1', 'a2', 'a3', 'a4', 'a5']
];

// Create a map of pixel coordinates to positions
let pixelToPositionMap = {};
for (let i = 0; i < positionMap.length; i++) {
  for (let j = 0; j < positionMap[i].length; j++) {
    let position = positionMap[i][j];
    let pixelCoord = pixelCoords.shift();
    pixelToPositionMap[pixelCoord.toString()] = position;
  }
}


// Detect circles in the image
let circles = new cv.Mat();
cv.HoughCircles(thresholded, circles, cv.HOUGH_GRADIENT, 1, 50, 200, 50, 0, 0,);

// Define the color thresholds for black and white balls
let blackThreshold = 60;
let whiteThreshold = 180;

// Iterate over the detected circles and display their positions
for (let i = 0; i < circles.cols; ++i) {
  let x = circles.data32F[i * 3];
  let y = circles.data32F[i * 3 + 1];
  let r = circles.data32F[i * 3 + 2];
  ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'red';
    ctx.stroke();
  
  // display the image with circles drawn on it
let result = document.getElementById("result");
result.appendChild(canvas);

  // Extract the color of the pixel at the center of the circle
  let pixelColor = img.ucharPtr(Math.round(y), Math.round(x));

  // Check if the pixel is black, white, or something else
  if (pixelColor[0] < blackThreshold) {
    console.log('Black ball detected at position (' + x + ', ' + y + ') with a radius of ' + r);
  } else if (pixelColor[0] > whiteThreshold) {
    console.log('White ball detected at position (' + x + ', ' + y + ') with a radius of ' + r);
  } else {
    console.log('Empty position detected at (' + x + ', ' + y + ') with a radius of ' + r);
  }
}



// Detect contours
let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(img, contours, hierarchy, cv.RETR_TREE, cv.CHAIN_APPROX_SIMPLE);

// Find the largest contour (the game board)
let maxContour = contours.get(0);
let maxContourArea = cv.contourArea(maxContour);
for (let i = 1; i < contours.size(); i++) {
    let contour = contours.get(i);
    let contourArea = cv.contourArea(contour);
    if (contourArea > maxContourArea) {
        maxContour = contour;
        maxContourArea = contourArea;
    }
}

// Draw the outline of the game board
let color = new cv.Scalar(255, 0, 0, 255);
cv.drawContours(img, contours, contours.indexOf(maxContour), color, 2, cv.LINE_8, hierarchy, 0);

// Fill the hexagonal game regions to create the final binary representation of the game board
cv.fillPoly(thresholded, hexagonalRegions, new cv.Scalar(255, 255, 255));

// Detect circles in the image
let circles = new cv.Mat();
cv.HoughCircles(thresholded, circles, cv.HOUGH_GRADIENT, 1, 50, 200, 50, 0, 0);

// Iterate over the detected circles and display their positions
for (let i = 0; i < circles.cols; ++i) {
  let x = circles.data32F[i * 3];
  let y = circles.data32F[i * 3 + 1];
  let r = circles.data32F[i * 3 + 2];

  // Check the color of the pixel at the center of the circle to determine its type
  let pixelColor = img.ucharPtr(Math.round(y), Math.round(x));
  if (pixelColor[0] < blackThreshold) {
    console.log('Black ball detected at position (' + positionMap[Math.round(y)][Math.round(x)] + ') with a radius of ' + r);
  } else if (pixelColor[0] > whiteThreshold) {
    console.log('White ball detected at position (' + positionMap[Math.round(y)][Math.round(x)] + ') with a radius of ' + r);
  } else {
    console.log('Empty position detected at (' + positionMap[Math.round(y)][Math.round(x)] + ') with a radius of ' + r);
  }
}


// Segment player 1's balls (black color)
let hsv = new cv.Mat();
let mask1 = new cv.Mat();
let mask2 = new cv.Mat();
let low = new cv.Mat(img.rows, img.cols, img.type(), [0, 0, 0, 0]);
let high = new cv.Mat(img.rows, img.cols, img.type(), [179, 255, 50, 0]);
cv.cvtColor(img, hsv, cv.COLOR_RGBA2RGB);
cv.cvtColor(hsv, hsv, cv.COLOR_RGB2HSV);
cv.inRange(hsv, low, high, mask1);
cv.threshold(mask1, mask1, 127, 255, cv.THRESH_BINARY);
cv.bitwise_not(mask1, mask2);

// Segment player 2's balls (white color)
let mask3 = new cv.Mat();
let mask4 = new cv.Mat();
let low2 = new cv.Mat(img.rows, img.cols, img.type(), [0, 0, 200, 0]);
let high2 = new cv.Mat(img.rows, img.cols, img.type(), [179, 20, 255, 0]);
cv.inRange(hsv, low2, high2, mask3);
cv.threshold(mask3, mask3, 127, 255, cv.THRESH_BINARY);
cv.bitwise_not(mask3, mask4);

// Find contours of the balls
let color1 = new cv.Scalar(0, 0, 0, 255);
let color2 = new cv.Scalar(255, 255, 255, 255);
let contours1 = new cv.MatVector();
let contours2 = new cv.MatVector();
let hierarchy1 = new cv.Mat();
let hierarchy2 = new cv.Mat();
cv.findContours(mask1, contours1, hierarchy1, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
cv.findContours(mask3, contours2, hierarchy2, cv.RETR_CCOMP, cv.CHAIN
                
// Free up the used memory
img.delete();
thresholded.delete();
circles.delete();


// Select the empty squares (background color)
let hsv2 = new cv.Mat();
let mask5 = new cv.Mat();
let mask6 = new cv.Mat();

// Define the color range for empty squares
let low3 = new cv.Mat(img.rows, img.cols, img.type(), [0, 0, 255, 0]);
let high3 = new cv.Mat(img.rows, img.cols, img.type(), [0, 0, 255, 0]);

// Apply color thresholding to obtain a binary image
cv.inRange(hsv, low3, high3, mask5);
cv.threshold(mask5, mask5, 127, 255, cv.THRESH_BINARY);

// Invert the binary image to obtain the empty square regions
cv.bitwise_not(mask5, mask6);

// Draw the contours of the empty square regions on the image
let color3 = new cv.Scalar(255, 255, 255, 255);
let contours3 = new cv.MatVector();
let hierarchy3 = new cv.Mat();
cv.findContours(mask5, contours3, hierarchy3, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
for (let i = 0; i < contours3.size(); i++) {
cv.drawContours(img, contours3, i, color3, 2, cv.LINE_8, hierarchy3, 0);
}

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const img = new Image();
img.onload = function() {
  ctx.drawImage(img, 0, 0);
  const dataURL = canvas.toDataURL();
};
img.src = 'image.jpg';

const src = cv.imread('canvasInput');
const dst = new cv.Mat();
const gray = new cv.Mat();
cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
cv.threshold(gray, gray, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
const contours = new cv.MatVector();
const hierarchy = new cv.Mat();
cv.findContours(gray, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);


const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture');

// Access the user's webcam
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(err => {
    console.error(`Error: ${err}`);
  });

// Add event listener to the capture button
captureButton.addEventListener('click', () => {
  // Draw the current frame of the video on the canvas
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get the image data from the canvas as a data URL
  const imageData = canvas.toDataURL('image/png');
  console.log(`Captured image data: ${imageData}`);
});


