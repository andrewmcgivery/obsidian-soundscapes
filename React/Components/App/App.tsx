import React, { useEffect, useState } from "react";
import { useObsidianPluginContext } from "../../Context/ObsidianPluginContext";
import {
	LocalPlayerState,
	PLAYER_STATE,
	SoundscapesPluginSettings,
} from "../../../main";
import Icon from "../Icon/Icon";
import Header from "../Header/Header";

// TODO: move to utils
function secondsToMinutesAndSeconds(seconds: number) {
	var minutes = Math.floor(seconds / 60);
	var remainingSeconds = Math.floor(seconds % 60);

	// Add leading zero if necessary
	var formattedSeconds =
		remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

	return minutes + ":" + formattedSeconds;
}

const App = () => {
	const { settingsObservable, localPlayerStateObservable, plugin } =
		useObsidianPluginContext();
	const [settings, setSettings] = useState<SoundscapesPluginSettings>(
		settingsObservable?.getValue()
	);
	const [localPlayerState, setLocalPlayerState] = useState<LocalPlayerState>(
		localPlayerStateObservable?.getValue()
	);

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

	/**
	 * Subscribe to local player state from Obsidian
	 */
	useEffect(() => {
		const unsubscribe = localPlayerStateObservable?.onChange(
			(newState: LocalPlayerState) => {
				setLocalPlayerState(newState);
			}
		);

		return () => {
			unsubscribe?.();
		};
	}, [setLocalPlayerState]);

	return (
		<>
			<Header />
			<div className="soundscapesmymusic-musiclist">
				<table className="soundscapesmymusic-musiclist-table">
					<thead>
						<tr>
							<th></th>
							<th>Title</th>
							<th>Artist</th>
							<th>Album</th>
							<th>Time</th>
						</tr>
					</thead>
					<tbody>
						{settings.myMusicIndex.map((song) => (
							<tr
								key={song.fullPath}
								onDoubleClick={() =>
									plugin?.changeMyMusicTrack(song.fileName)
								}
							>
								<td>
									{localPlayerState.currentTrack?.fileName ===
										song.fileName &&
										localPlayerState.playerState ===
											PLAYER_STATE.PLAYING && (
											<Icon name="volume-2" />
										)}

									{localPlayerState.currentTrack?.fileName ===
										song.fileName &&
										localPlayerState.playerState ===
											PLAYER_STATE.PAUSED && (
											<Icon name="volume" />
										)}
								</td>
								<td>{song.title || song.fileName}</td>
								<td>{song.artist}</td>
								<td>{song.album}</td>
								<td>
									{secondsToMinutesAndSeconds(
										song.duration || 0
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</>
	);
};

export default App;
