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
