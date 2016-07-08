(function() {
	Monocular.initialize({
		clientId: 'bd32773b82498a30d58e314d8e35a14f',
		baseURL: 'http://monocular.dev/api',
		oauthURL: 'http://monocular.dev/api/oauth'
	});

	const runBtn = $('#runBtn');
	const output = $('#output');

	var imageIds = [];
	var img7Id = '';
	var bucketId = '';
	var detectorId = '';
	var imagePaths = [
		'images/1.png',
		'images/2.png',
		'images/3.png',
		'images/4.png',
		'images/5.png',
		'images/6.png',
		'images/7.png',
		'images/8.png',
		'images/9.png',
		'images/10.png',
		'images/11.png',
		'images/12.png',
	]

	var boxes = [
		[{ "top": 36, "left": 66, "bottom": 129, "right": 153 },],
		[{ "top": 33, "left": 215 , "bottom": 172, "right": 368 },],
		[{ "top": 114, "left": 234, "bottom": 191, "right": 311 },],
		[{ "top": 17, "left": 71, "bottom": 92, "right": 149 },],
		[{ "top": 59, "left": 67, "bottom": 392, "right": 376 },],
		[{ "top": 182, "left": 117, "bottom": 434, "right":  376},],
		[{ "top": 50, "left": 67, "bottom": 409, "right": 383 },],
		[{ "top": 74, "left": 98, "bottom": 374, "right": 408 },],
		[{ "top": 215, "left": 365, "bottom": 282, "right": 429 },],
		[{ "top": 50, "left": 26, "bottom": 213, "right": 192 },],
		[{ "top": 45, "left": 506, "bottom": 273, "right": 705 },],
		[{ "top": 182, "left": 376, "bottom": 367, "right": 554 },],
	]

	// Upload a single image
	function upload(path, label, boundingBoxes, cb) {
		const img = new Image();
		img.src = path;
		output.text('Uploading');

		img.onload = function()  {

			// var canvas = Monocular.util.imageToCanvas(img);
			// console.log(canvas)
			const options = {
				'label': label,
				'boundingBoxes': boundingBoxes
			}


			Monocular.image.create(img, options).then(function(response) {
				cb(null, response);
			}).catch(function(err) {
				cb(err);
			});
		}
	}

	function run() {
		async.series([
			function(cb) {
				var i = 0;
				async.each(imagePaths, function(imagePath, callback) {
					upload(imagePath, 'stop sign ' + i, boxes[i], function(err, response) {
						if (err) {
							output.text('Uploading Failed');
							callback(err);
						} else {
							if (imagePath === 'images/7.png') {
								img7Id = response.id;
							}
							imageIds.push(response.id);
							callback();
						}
					});
					i++;
				}, function(err) {
					if (err) {
						cb(err);
					} else {
						cb();
					}
				});
			},
			function(cb) {
				Monocular.image.flip(img7Id).then(function(response) {
					detectorId = response.id;
					cb();
				}).catch(function(err) {
					output.text('Flip Image 6 Failed');
					cb(err);
				});
			},
			function(cb) {
				output.text('Creating Databucket');
				Monocular.databucket.create('Stop Signs').then(function(response) {
					bucketId = response.id;
					output.text('Bucket Created, Adding Images');
					console.log(imageIds);
					Monocular.databucket.addData(bucketId, imageIds).then(function(response) {
						output.text('Images Added to Bucket');
						cb();
					}).catch(function(err) {
						output.text('Failed to Add Images');
					});
				}).catch(function(err) {
					output.text('Bucket Creation Failed, ' + err.message);
				});
			},
			function(cb) {
				output.text('Creating Detector');
				Monocular.detector.create('Stop Sign Detector').then(function(response) {
					detectorId = response.id;
					output.text('Detector Created, Adding Bucket');
						// TODO CHANGE
					Monocular.detector.addBucket(bucketId).then(function(resposne) {
						output.text('Bucket Added to Detector')
						cb();
					});
				}).catch(function(err) {
					output.text('Detector Creation Failed, ' + err.message);
				});
			},
			function(cb) {
				Monocular.databucket.upscale(bucketId).then(function(response) {
					detectorId = response.id;
					cb();
				}).catch(function(err) {
					output.text('Bucket Upscaling Failed');
				});
			},
			function(cb) {
				pollBucket(function(err) {
					if (err) {
						output.text('Bucket Polling Failed');
					} else {
						output.text('Bucket Upscaled, Training Detector')
						cb();
					}
				});
			},
			function(cb) {
				Monocular.detector.train(detectorId).then(function(response) {
					cb();
				});
			},
			function(cb) {
				pollDetector(function(err) {
					if (err) {
						output.text('Detector Polling Failed');
					} else {
						output.text('Detector Trained, Testing Detector');
						cb();
					}
				});
			},
			function(cb) {

			}
		], function(err) {
			if (err) {
				output.text('Something went wrong.' + err)
				console.error(err);
			} else {
				Monocular.detector.detect(detectorId).then(function(response) {
					output.text('Results: ' + response);
				});
			}
		})
	}

	function pollBucket(cb) {
		output.text('Waiting for Bucket to Upscale');
		setTimeout(function () {
			Monocular.databucket.getDatabucket(databucketID).then(function(response) {
				if (repsonse.processingData.status !== 'READY') {
					pollBucket(cb);
				} else {
					cb()
				}
			}).catch(function(err) {
				cb(err);
			});
		}, 1000);
	}

	function pollDetector(cb) {
		output.text('Waiting for Detector to Train');
		setTimeout(function () {
			Monocular.databucket.getDatabucket(databucketID).then(function(response) {
				if (repsonse.trainingData.status !== 'SUCCESS') {
					pollBucket(cb);
				} else {
					cb()
				}
			}).catch(function(err) {
				cb(err);
			});
		}, 1000);
	}

	$('#runBtn').on('click', function() {
		console.log('click');
		run();
	});
}).call(this);
