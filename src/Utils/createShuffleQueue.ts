import { LocalMusicFile } from "src/Types/Interfaces";

/**
 * Given a list of songs, convert it to an array in indexes and then shuffle it. Return the shuffled array of indexes.
 * @param songs
 */
const createShuffleQueue = (songs: LocalMusicFile[]): number[] => {
	const queue = Array.from(songs.keys()); // Get all indexes [0,1,2,3,..etc]

	// Shuffle indexes
	for (let i = queue.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[queue[i], queue[j]] = [queue[j], queue[i]];
	}

	return queue;
};

export default createShuffleQueue;
