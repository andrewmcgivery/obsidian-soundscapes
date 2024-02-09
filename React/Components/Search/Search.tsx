import React, { useEffect, useMemo, useState } from "react";
import { useObsidianPluginContext } from "../../Context/ObsidianPluginContext";
import { SoundscapesPluginSettings } from "../../../main";
import Icon from "../Icon/Icon";

const Search = () => {
	const { settingsObservable, plugin } = useObsidianPluginContext();
	const [settings, setSettings] = useState<SoundscapesPluginSettings>(
		settingsObservable?.getValue()
	);
	const [query, setQuery] = useState("");
	const [selectedResultIndex, setSelectedResultIndex] = useState(0);

	const searchResult = useMemo(
		() =>
			query.trim().length === 0
				? []
				: settings.myMusicIndex
						.filter(
							(song) =>
								(song.title &&
									song.title
										.toLowerCase()
										.indexOf(query.toLowerCase()) > -1) ||
								(song.artist &&
									song.artist
										.toLowerCase()
										.indexOf(query.toLowerCase()) > -1) ||
								(song.album &&
									song.album
										.toLowerCase()
										.indexOf(query.toLowerCase()) > -1) ||
								song.fileName
									.toLowerCase()
									.indexOf(query.toLowerCase()) > -1
						)
						.slice(0, 5),
		[settings.myMusicIndex, query]
	);

	/**
	 * When query changes, reset selected index to 0
	 */
	useEffect(() => {
		setSelectedResultIndex(0);
	}, [query, setSelectedResultIndex]);

	/**
	 * Subscribe to settings from Obsidian
	 */
	useEffect(() => {
		const unsubscribe = settingsObservable?.onChange(
			(newSettings: SoundscapesPluginSettings) => {
				setSettings(newSettings);
			}
		);

		return () => {
			unsubscribe?.();
		};
	}, [setSettings]);

	return (
		<div className="soundscapesmymusic-right-search">
			<Icon name="search" />
			<input
				type="text"
				className="soundscapesmymusic-right-search-input"
				placeholder="Search"
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				onFocus={(e) => {
					e.target.addClass(
						"soundscapesmymusic-right-search--active"
					);
				}}
				onBlur={(e) => {
					// Need to delay this so the click event can be picked up first
					setTimeout(
						() =>
							e.target.removeClass(
								"soundscapesmymusic-right-search--active"
							),
						100
					);
				}}
				onKeyUp={(e) => {
					if (searchResult.length > 0) {
						switch (e.key) {
							case "ArrowUp":
								if (selectedResultIndex > 0) {
									setSelectedResultIndex(
										selectedResultIndex - 1
									);
								}
								break;
							case "ArrowDown":
								if (
									selectedResultIndex <
									searchResult.length - 1
								) {
									setSelectedResultIndex(
										selectedResultIndex + 1
									);
								}
								break;
							case "Enter":
								plugin?.changeMyMusicTrack(
									searchResult[selectedResultIndex].fileName
								);
								break;
						}
					}
				}}
			/>
			<div className="soundscapesmymusic-right-search-results">
				{query.trim() !== "" && searchResult.length === 0 && (
					<div className="soundscapesmymusic-right-search-results-message">
						No results found
					</div>
				)}
				{query.trim() === "" && (
					<div className="soundscapesmymusic-right-search-results-message">
						Start typing for results...
					</div>
				)}
				{searchResult.map((song, index) => (
					<div
						key={song.fileName}
						className={`soundscapesmymusic-right-search-results-result ${
							selectedResultIndex === index &&
							"soundscapesmymusic-right-search-results-result--selected"
						}`}
						onClick={() =>
							plugin?.changeMyMusicTrack(song.fileName)
						}
					>
						<div className="soundscapesmymusic-right-search-results-result-line1">
							{song.title || song.fileName}
						</div>
						<div className="soundscapesmymusic-right-search-results-result-line2">
							{song.artist}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default Search;
