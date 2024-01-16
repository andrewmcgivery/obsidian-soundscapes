/**
 * Given a function, ensures that it is only called once every x milliseconds. Guarantees that the last call to the function is executed.
 * @param func
 * @param delay
 */
const debounce = (func: Function, delay: number) => {
	let timeoutId: NodeJS.Timeout;

	return function (...args: any) {
		clearTimeout(timeoutId);

		timeoutId = setTimeout(() => {
			func.apply(this, args);
		}, delay);
	};
};

export default debounce;
