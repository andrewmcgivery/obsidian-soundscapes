import fs from "fs";
import path from "path";

const MUSIC_FILE_EXTENSIONS = ["mp3"];

/**
 * Given a file path, builds a list of music files by recursively going through the file structure and finding
 * files with appropriate file extensions.
 * @param dirPath
 * @param fileArray
 */
const getAllMusicFiles = (
	dirPath: string,
	fileArray: Array<string> | undefined = undefined
) => {
	const files = fs.readdirSync(dirPath);

	fileArray = fileArray || [];

	files.forEach((file) => {
		const filePath = path.join(dirPath, file);
		if (fs.statSync(filePath).isDirectory()) {
			fileArray = getAllMusicFiles(filePath, fileArray);
		} else if (
			MUSIC_FILE_EXTENSIONS.includes(path.extname(filePath).slice(1))
		) {
			fileArray?.push(filePath);
		}
	});

	return fileArray;
};

export default getAllMusicFiles;
