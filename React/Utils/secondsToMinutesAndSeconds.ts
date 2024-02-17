/**
 * Given a number of seconds, returns a string formatted with minutes:seconds.
 *
 * For example, 70 seconds would return 1:10.
 * @param seconds
 */
const secondsToMinutesAndSeconds = (seconds: number) => {
	var minutes = Math.floor(seconds / 60);
	var remainingSeconds = Math.floor(seconds % 60);

	// Add leading zero if necessary
	var formattedSeconds =
		remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

	return minutes + ":" + formattedSeconds;
};

export default secondsToMinutesAndSeconds;
