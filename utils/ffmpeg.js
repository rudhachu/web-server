const fs = require('fs');
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const { path: ffmpegPath } = require('@ffmpeg-installer/ffmpeg');

// Asynchronous import for 'file-type'
const fromBuffer = async () => {
		const module = await import("file-type");
		return module.fromBuffer;
};

const { writeFileSync, unlinkSync, existsSync, readFileSync, mkdirSync } = fs;
ffmpeg.setFfmpegPath(ffmpegPath);

const tempDir = path.join(os.tmpdir(), 'media-temp');

// Ensure temp directory exists
if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });

// Function to create unique temporary file paths
function createTempPath(ext) {
		return path.join(tempDir, `${Date.now()}.${ext}`);
}

// Clean up temporary files
function cleanUp(paths = []) {
		paths.forEach(file => existsSync(file) && unlinkSync(file));
}

// Convert audio to video with black background
async function audioToBlackVideo(input, options = {}) {
		const {
				width = 1920,
				height = 1080,
				backgroundColor = 'black',
				fps = 30,
		} = options;

		const audioInputPath = createTempPath('mp3');
		const videoOutputPath = createTempPath('mp4');
		const inputPath =
				input instanceof Buffer
						? (writeFileSync(audioInputPath, input), audioInputPath)
						: input;

		return new Promise((resolve, reject) => {
				ffmpeg()
						.input(`color=${backgroundColor}:s=${width}x${height}:r=${fps}`)
						.inputOptions(['-f', 'lavfi'])
						.input(inputPath)
						.outputOptions([
								'-c:v', 'libx264',
								'-preset', 'ultrafast',
								'-crf', '23',
								'-c:a', 'aac',
								'-b:a', '128k',
								'-map', '0:v',
								'-map', '1:a',
								'-shortest',
						])
						.output(videoOutputPath)
						.on('end', () => {
								const videoBuffer = readFileSync(videoOutputPath);
								cleanUp([audioInputPath, videoOutputPath]);
								resolve(videoBuffer);
						})
						.on('error', err => {
								cleanUp([audioInputPath, videoOutputPath]);
								reject(err);
						})
						.run();
		});
}

// Flip media (image or video)
async function flipMedia(inputBuffer, direction = 'horizontal') {
		const validDirections = ['left', 'right', 'vertical', 'horizontal'];
		if (!validDirections.includes(direction?.toLowerCase())) {
				throw new Error('Invalid direction. Use: left, right, vertical, or horizontal');
		}

		const type = await fromBuffer(inputBuffer);
		if (!type || !['image', 'video'].includes(type.mime.split('/')[0])) {
				throw new Error('Invalid input: must be an image or video file.');
		}

		const inputPath = `/tmp/media-temp/input_${Date.now()}.${type.ext}`;
		const outputPath = `/tmp/media-temp/output_${Date.now()}.${type.ext}`;

		try {
				mkdirSync('/tmp/media-temp', { recursive: true });

				writeFileSync(inputPath, inputBuffer);

				const command = ffmpeg(inputPath);

				switch (direction.toLowerCase()) {
						case 'left':
								command.videoFilters('transpose=2');
								break;
						case 'right':
								command.videoFilters('transpose=1');
								break;
						case 'vertical':
								command.videoFilters('vflip');
								break;
						case 'horizontal':
								command.videoFilters('hflip');
								break;
				}

				await new Promise((resolve, reject) => {
						command.on('end', resolve).on('error', reject).save(outputPath);
				});

				const outputBuffer = readFileSync(outputPath);
				return outputBuffer;
		} catch (error) {
				throw new Error(`FFmpeg error: ${error.message}`);
		} finally {
				try {
						if (existsSync(inputPath)) unlinkSync(inputPath);
						if (existsSync(outputPath)) unlinkSync(outputPath);
				} catch (cleanupError) {
						console.error('Cleanup error:', cleanupError);
				}
		}
}

// Convert audio to MP3 format
async function audioToMp3(inputBuffer) {
		const inputPath = createTempPath('tmp');
		const outputPath = createTempPath('mp3');

		writeFileSync(inputPath, inputBuffer);

		await new Promise((resolve, reject) => {
				ffmpeg(inputPath)
						.toFormat('mp3')  // Convert to MP3 format
						.audioCodec('libmp3lame')  // Use MP3 codec
						.audioChannels(2)  // Stereo output
						.audioFrequency(44100)  // Standard audio frequency for MP3
						.outputOptions(['-b:a 192k'])  // Set bit rate for MP3
						.on('error', reject)
						.on('end', resolve)
						.save(outputPath);
		});

		const convertedBuffer = readFileSync(outputPath);
		cleanUp([inputPath, outputPath]);
		return convertedBuffer;
}

module.exports = { audioToBlackVideo, flipMedia, audioToMp3 };