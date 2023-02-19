// Load the image from a file or camera
let img = cv.imread('canvasInput');

// Convert to grayscale to make contour detection easier
cv.cvtColor(img, img, cv.COLOR_RGBA2GRAY);v

// Apply a threshold to convert the image to a binary image
let thresholded = new cv.Mat();
cv.threshold(img, thresholded, 100, 255, cv.THRESH_BINARY);

// Detect circles in the image
let circles = new cv.Mat();
cv.HoughCircles(thresholded, circles, cv.HOUGH_GRADIENT, 1, 50, 200, 50, 0, 0);

// Iterate over the detected circles and display their positions
for (let i = 0; i < circles.cols; ++i) {
  let x = circles.data32F[i * 3];
  let y = circles.data32F[i * 3 + 1];
  let r = circles.data32F[i * 3 + 2];
  console.log('Bille détectée à la position (' + x + ', ' + y + ') avec un rayon de ' + r);
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
